/*
 * 페이지 본문을 절 단위로 자른다 — 레이아웃 프리셋의 재료 (ssccops#382 후속).
 *
 * ── 왜 자르나 ────────────────────────────────────────────────
 * 본문은 홍보국이 어드민에서 쓰는 평범한 마크다운이고 렌더러(`@ssccops/ui` `Markdown`)는 그것을
 * 한 덩어리로 흘린다. 그러면 소개·핵심 가치·FAQ·처리방침이 전부 «제목 · 문단 · 제목 · 문단»
 * 한 가지 모양이 된다. 핵심 가치 셋을 카드 격자로, FAQ를 접이식 Q/A로, 처리방침에 목차를 세우려면
 * 절 경계를 알아야 한다 — 그래서 `##`(절)과 `###`(소절)에서 자르고, 각 절의 본문은 다시 렌더러에
 * 맡긴다. 본문에 특별한 문법은 없다(ADR-0038 «정형 블록의 모양»을 포기한 자리 — 구조만 본다).
 *
 * 홈의 `views/home/model/intro.ts`와 같은 판단(줄 단위 · AST 파싱은 과하다)이다. 다른 점은
 * 절 **안의** 마크다운을 글자로 뭉개지 않고 원문 그대로 돌려준다는 것 — 렌더러가 그린다.
 *
 * ── 규칙 ────────────────────────────────────────────────────
 * - 첫 헤딩 앞의 **첫 문단**이 평문이면 `lede`(리드) — 화면이 본문보다 크게 세운다. 표·목록·인용으로
 *   시작하면 리드가 없고, 리드 뒤에 남은 것(운영진의 표 · 처리방침의 «초안» 인용)은 헤딩 없는 절이
 *   되어 본문 카드 안에서 첫 절 앞에 선다.
 * - `# `는 `##`과 같이 절로 본다(화면 제목이 `<h1>`이라 본문 안의 `#`은 어차피 한 단계 내려간다).
 * - `###`는 바로 위 절의 소절. 위에 절이 없으면(FAQ처럼 `###`만 있는 본문) 그 자체가 절이다.
 * - `####` 아래는 자르지 않는다 — 절 본문의 일부로 렌더러가 그린다.
 * - 절 사이의 `---`는 헤딩 없는 절을 연다(핵심 가치의 맺음말처럼 «카드 뒤의 문단»). 절 안에서
 *   가로줄로 쓰고 싶으면 `***`을 쓴다 — 그것은 자르지 않는다.
 * - 코드 펜스(```) 안의 `#`·`---`는 보지 않는다.
 * - 헤딩 글자는 원문 그대로다(인라인 문법을 해석하지 않는다) — 절 제목에 강조·링크를 쓰지 않는다.
 */

export interface ContentSection {
  /** 2 = `##`(또는 `#`), 3 = `###` */
  level: 2 | 3;
  /** `---`로 연 절은 null */
  heading: string | null;
  /** 헤딩 아래·첫 소절 앞까지의 원문(앞뒤 빈 줄 제거) */
  body: string;
  /** `###` 소절 — level 2 절에만 있다 */
  children: ContentSection[];
}

export interface ContentSections {
  /** 첫 헤딩 앞의 첫 문단(평문일 때) — 없으면 빈 문자열 */
  lede: string;
  sections: ContentSection[];
}

const HEADING = /^(#{1,3})\s+(.+?)\s*#*\s*$/;
const RULE = /^---+\s*$/;
const FENCE = /^(```|~~~)/;
/** 문단이 아닌 블록의 첫 줄 — 표·목록·인용·코드·이미지 */
const NOT_PROSE = /^(\||[-*+]\s|\d+[.)]\s|>|```|~~~|!\[)/;

/** 첫 헤딩 앞의 글을 리드 한 문단과 나머지로 가른다 */
function splitLede(lines: string[]): { lede: string; rest: string } {
  const text = trimLines(lines);
  if (!text) return { lede: "", rest: "" };
  const [first, ...others] = text.split(/\n[ \t]*\n/);
  if (NOT_PROSE.test(first)) return { lede: "", rest: text };
  return { lede: first.trim(), rest: others.join("\n\n").trim() };
}

function trimLines(lines: string[]): string {
  return lines.join("\n").trim();
}

type Open = ContentSection & { lines: string[] };

export function splitSections(mtxt: string): ContentSections {
  const lines = mtxt.split(/\r?\n/);
  const sections: ContentSection[] = [];
  const head: string[] = [];

  // 열려 있는 절·소절. 닫는 함수들이 함께 만지므로 지역 `let`이 아니라 한 객체다(좁히기가 닫힘
  // 함수의 대입을 못 봐서 `never`가 된다)
  const open: { parent: Open | null; child: Open | null } = { parent: null, child: null };
  let inFence = false;

  const closeChild = () => {
    if (open.child && open.parent) {
      open.parent.children.push({
        level: 3,
        heading: open.child.heading,
        body: trimLines(open.child.lines),
        children: [],
      });
    }
    open.child = null;
  };
  const closeParent = () => {
    closeChild();
    if (open.parent) {
      sections.push({
        level: open.parent.level,
        heading: open.parent.heading,
        body: trimLines(open.parent.lines),
        children: open.parent.children,
      });
    }
    open.parent = null;
  };
  const start = (level: 2 | 3, heading: string | null) => {
    if (level === 3 && open.parent) {
      closeChild();
      open.child = { level: 3, heading, body: "", children: [], lines: [] };
      return;
    }
    closeParent();
    open.parent = { level, heading, body: "", children: [], lines: [] };
  };

  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence;
    if (!inFence) {
      const h = HEADING.exec(line);
      if (h) {
        start(h[1].length === 3 ? 3 : 2, h[2]);
        continue;
      }
      if (RULE.test(line) && open.parent) {
        start(2, null);
        continue;
      }
    }
    if (open.child) open.child.lines.push(line);
    else if (open.parent) open.parent.lines.push(line);
    else head.push(line);
  }
  closeParent();

  const { lede, rest } = splitLede(head);
  if (rest) sections.unshift({ level: 2, heading: null, body: rest, children: [] });
  return { lede, sections };
}
