/*
 * 홈 hero·소개 블록의 재료 — 페이지 `home-intro`의 마크다운 원문을 최소한으로 읽는다 (#524 · ssccops#385).
 *
 * ── 왜 원문을 직접 자르나 ───────────────────────────────────
 * hero는 큰 문장 하나와 문단 하나이고, 소개 블록은 제목 넷과 한 줄씩이다. 본문 렌더러
 * (`Markdown`)로 그리면 본문 크기(15px/1.75)로 흘러 hero가 되지 않고, 블록 넷을 카드 격자로
 * 놓으려면 어차피 절 단위로 잘라야 한다. 마크다운을 AST로 파싱하는 것은 이 두 가지에 과하다 —
 * 줄 단위로 `# `·`## `·`### `만 본다. 그래서 **본문 안의 강조·링크 문법은 해석하지 않고 글자
 * 그대로 나간다** — 홍보국이 hero 문단에 문법을 쓰면 그대로 보이므로 `content-slugs.ts` 주석에
 * 적어 두었다.
 *
 * ── 페이지 모양 ──────────────────────────────────────────────
 * ```
 * # 큰 문장
 * 소개 문단(여러 줄·여러 문단 가능)
 * ## 무엇을 하나          ← 있으면 소개 블록, 없으면 코드의 기본 문구
 * ### 세미나
 * 한 줄
 * ### 프로젝트
 * ...
 * ```
 * 첫 `# `가 없으면 제목은 기본 문구이고, 첫 `## ` 앞까지가 문단이다.
 */

export interface HomeIntro {
  /** hero 큰 문장 */
  headline: string;
  /** hero 문단 — 빈 줄로 나뉜 문단 배열 */
  paragraphs: string[];
}

export interface IntroBlock {
  title: string;
  body: string;
}

/** 페이지 `home-intro`가 없거나 못 읽었을 때 — 홈이 비어 보이지 않게 하는 기본 문구 */
export const DEFAULT_INTRO: HomeIntro = {
  headline: "만들고, 나누고, 함께 자랍니다",
  paragraphs: ["SSCC는 1983년부터 이어져 온 숭실대학교 중앙 컴퓨터 학술동아리입니다."],
};

/**
 * 소개 4블록의 기본 문구 — 페이지 `about`의 «무엇을 하나» 절(옛 사이트 문구)을 홈에 맞게
 * 한 줄로 줄인 것이다. `home-intro`에 `## 무엇을 하나` 절이 생기면 그쪽이 이긴다.
 */
export const DEFAULT_INTRO_BLOCKS: readonly IntroBlock[] = [
  { title: "세미나", body: "선배들이 직접 전하는 경험과 핵심 기술을 배웁니다." },
  { title: "프로젝트", body: "아이디어를 서비스로 직접 구현하며 협업을 경험합니다." },
  { title: "스터디", body: "기초부터 심화까지 함께 공부하며 개발 기본기를 다집니다." },
  { title: "행사", body: "선후배가 다 함께 어우러지며 네트워크와 추억을 쌓습니다." },
];

const WHAT_WE_DO_HEADING = "무엇을 하나";

const H1 = /^#\s+(.+?)\s*$/;
const H2 = /^##\s+(.+?)\s*$/;
const H3 = /^###\s+(.+?)\s*$/;

/** 빈 줄로 문단을 가른다 — 문단 안의 줄바꿈은 공백 하나로 잇는다(마크다운의 soft break와 같다) */
function toParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 0) paragraphs.push(current.join(" "));
    current = [];
  };
  for (const line of lines) {
    if (line.trim() === "") flush();
    else current.push(line.trim());
  }
  flush();
  return paragraphs;
}

/** hero — 첫 `# `와 그 아래 첫 `## ` 앞까지. 제목이 없으면 기본 제목, 문단이 없으면 기본 문단 */
export function parseHomeIntro(mtxt: string): HomeIntro {
  const lines = mtxt.split(/\r?\n/);
  let headline: string | null = null;
  const body: string[] = [];

  for (const line of lines) {
    if (H2.test(line)) break;
    const h1 = H1.exec(line);
    if (h1 && headline === null) {
      headline = h1[1];
      continue;
    }
    // 제목 앞의 줄은 버린다 — hero 문단은 제목 아래에서 시작한다
    if (headline !== null) body.push(line);
  }

  const paragraphs = toParagraphs(body);
  return {
    headline: headline ?? DEFAULT_INTRO.headline,
    paragraphs: paragraphs.length > 0 ? paragraphs : DEFAULT_INTRO.paragraphs,
  };
}

/**
 * 소개 블록 — `## 무엇을 하나` 절의 `### 제목` + 문단. 절이 없거나 비어 있으면 null(기본 문구로).
 *
 * 블록 수를 넷으로 강제하지 않는다 — 홍보국이 다섯을 쓰면 다섯이 선다. 제목만 있고 문단이 없는
 * 블록은 문단을 빈 채로 둔다(없는 값을 지어내지 않는다).
 */
export function parseIntroBlocks(mtxt: string): IntroBlock[] | null {
  const lines = mtxt.split(/\r?\n/);
  const start = lines.findIndex((line) => H2.exec(line)?.[1] === WHAT_WE_DO_HEADING);
  if (start < 0) return null;

  const blocks: IntroBlock[] = [];
  let current: { title: string; lines: string[] } | null = null;
  const flush = () => {
    if (current) blocks.push({ title: current.title, body: toParagraphs(current.lines).join(" ") });
    current = null;
  };

  for (const line of lines.slice(start + 1)) {
    if (H2.test(line)) break;
    const h3 = H3.exec(line);
    if (h3) {
      flush();
      current = { title: h3[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();

  return blocks.length > 0 ? blocks : null;
}
