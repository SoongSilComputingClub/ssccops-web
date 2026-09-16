import type { AssistantAnswer, AssistantCitation } from "./types";

/*
 * 인용 카드와 근거 배지의 표시 규칙 (#433 · #462 · 기획안 §6.3 · §13.1).
 *
 * **여기가 「없는 값」을 다루는 자리다.** 전송 계층(`api/`)은 서버가 비운 필드를 그대로 null로
 * 옮기고, 그것을 무엇으로 그릴지는 그리는 쪽이 정한다(AGENTS.md) — `PAGE`인데 `page`가 빈
 * 것은 DOCX라서 정상이고, 그때 카드는 문서명까지만 간다.
 */

/**
 * 인용 카드의 제목 한 줄.
 *
 * `ARTICLE`이면 «제2장 회원 · 제7조 (회원의 구분)», `PAGE`면 «2026 지원금 집행 지침 p.12».
 * **한 답변에 둘이 섞이는 것이 정상이다** — 회칙이 세부 규정을 다른 문서에 위임한다.
 *
 * 빈 조각은 넣지 않는다. `p.`만 남은 «지침 p.» 같은 문자열을 만들지 않기 위해서다.
 *
 * **`marker`로 대신하지 않는다**(#464). 서버가 표기의 정본을 갖게 된 뒤에도 이 조립이 남는
 * 이유는 그 값이 **일부러 짧기** 때문이다 — `marker`는 본문의 대괄호 안에 들어갈 `제7조`이고,
 * 여기 필요한 것은 장과 조 제목까지 갖춘 «제2장 회원 · 제7조 (회원의 구분)»이다. 카드는 넓고
 * 대괄호는 좁다. **서버가 내리지 않는 값을 웹이 지어내는 것이 아니라**, 서버가 내린 조각
 * (`chapter`·`article`·`supplementary`)을 카드 폭에 맞게 잇는 표시 규칙이다.
 *
 * **«6항»이 붙던 자리다**(#464 · 서버 #447). `clause`가 영영 `null`이 되어 그 분기가 죽은
 * 코드였고, 항의 내용은 `snippet`이 그대로 보여 준다.
 */
export function citationLabel(citation: AssistantCitation): string {
  if (citation.citationType === "ARTICLE") {
    /*
     * 부칙 표시를 `article` 문자열에 기대지 않고 `supplementary`로 붙인다. 서버가 그 불리언을
     * 따로 내리는 이유가 **부칙에서 조번호가 1로 리셋되기** 때문이고, 문자열을 파싱해 판단하면
     * 본칙 제1조와 부칙 제1조가 화면에서 같아진다.
     */
    const article =
      citation.article && citation.supplementary === true
        ? `부칙 ${citation.article}`
        : citation.article;

    const label = [citation.chapter, article].filter(Boolean).join(" · ");
    return label || (citation.docTitle ?? "인용");
  }

  /*
   * `page`가 null이면 문서명까지만 간다 — DOCX에는 페이지가 없다(서버 #398). 「전부 1쪽」으로
   * 채우면 9쪽의 문장을 찾으러 1쪽을 여는 사람이 생긴다.
   */
  const page = citation.page === null ? null : `p.${citation.page}`;
  const label = [citation.docTitle, page].filter(Boolean).join(" ");
  return label || "인용";
}

/**
 * 인용 카드의 보조 줄 — **조항 인용에만 있다**.
 *
 * 조항 카드의 제목 줄은 «제2장 회원 · 제7조»라 어느 문서의 제7조인지를 말하지 않는다.
 * 페이지 카드는 제목 줄이 이미 문서명으로 시작하므로 같은 이름을 두 번 적지 않는다.
 *
 * **판본(`v1`)을 붙이던 자리다**(#462 · 서버 ADR-0034). 문서 한 건이 곧 그 규정이라 붙일 판본이
 * 없고, 서버는 그 필드를 내리지 않는다 — 웹에 남은 `v${docVer}`가 `vundefined`를 화면에 찍고
 * 있었다. 「값이 있을 때만」 조건으로 남기지 않는 것은 그 값이 **영영 없기** 때문이다.
 */
export function citationSource(citation: AssistantCitation): string | null {
  if (citation.citationType !== "ARTICLE") return null;
  return citation.docTitle || null;
}

/**
 * 답변 위의 근거 배지 — «2026-03-24부터 쓰이는 회칙 기준» · «아직 쓰이지 않는 문서 기준».
 *
 * **두 답이 화면에서 같아 보이면 안 된다**(§13.1). 거절이면 기댄 문서가 없으므로 null이고,
 * 그때 화면은 배지를 그리지 않는다.
 *
 * 문서명은 **첫 인용의 것**을 쓴다 — 서버가 적용 상태를 그렇게 정하고(유사도 순서 그대로),
 * 배지가 답하는 물음이 «무엇을 근거로 읽었나» 하나이기 때문이다.
 *
 * **«판본 배지»였다**(#462 · 서버 ADR-0034). 판본 개념이 없어진 뒤 이 배지가 답하는 것은
 * «몇 번째 판이냐»가 아니라 **문서의 적용 상태**(미사용 · 답변에 사용 중 · 제외됨)다 — 이름에
 * 판본이 남아 있으면 없어진 축을 되살리는 코드가 다시 붙는다.
 */
export function basisBadgeLabel(answer: AssistantAnswer): string | null {
  if (!answer.answered || answer.applyStatus === null) return null;

  const docTitle = answer.citations[0]?.docTitle ?? null;

  /*
   * DRAFT는 쓰이기 시작한 날이 없다. 날짜 자리를 비운 문장으로 흘리지 않고 통째로 바꾸는
   * 것은, 「지금 쓰이는 회칙」과 「아직 쓰이지 않는 문서」가 한눈에 갈려야 하기 때문이다.
   */
  if (answer.applyStatus === "DRAFT") {
    return [docTitle, "아직 쓰이지 않는 문서 기준"].filter(Boolean).join(" ");
  }

  /*
   * 답변에서 제외한 문서다. Phase 1의 검색 조건이 `EFFECTIVE`뿐이라 지금 이 값은 내려오지
   * 않지만, `EFFECTIVE`와 같은 문장으로 흘리면 **제외한 회칙의 답이 지금 회칙의 답처럼
   * 보인다** — DRAFT를 가르는 이유와 같은 이유라 같은 자리에서 가른다.
   *
   * 문구는 규정 설정 화면의 상태 표시명과 같은 말을 쓴다(«제외됨» — `entities/rag-document`).
   * 그 화면이 «시행/내리기»에서 «답변에 사용/제외»로 옮겨 갈 때(#468) 이 배지도 함께 옮겼다.
   */
  if (answer.applyStatus === "SUPERSEDED") {
    const superseded = answer.effectiveDate ? `${answer.effectiveDate}부터 쓰던 ` : "";
    return `${superseded}${docTitle ?? ""} 제외된 문서 기준`.replace(/\s+/g, " ").trim();
  }

  const effective = answer.effectiveDate ? `${answer.effectiveDate}부터 쓰이는` : null;
  return [effective, docTitle, "기준"].filter(Boolean).join(" ");
}

/**
 * 본문의 `[3]`을 **서버가 만든 표기로 갈아 그린다** — `[제7조]` · `[부칙 제3조]` · `[p.12]`
 * (#464 · 서버 #447).
 *
 * ── 왜 번호를 그대로 두지 않는가 ────────────────────────────
 * **서버가 화면에 맡긴 선택이다**(«본문의 번호를 그대로 둘지 이 표기로 갈아 그릴지는 화면이
 * 고른다»). 갈아 그리는 쪽을 고른 것은 **읽는 사람이 번호를 해석할 근거가 화면에 없기**
 * 때문이다 — `[3]`은 «모델에게 넣어 준 발췌 여덟 개 중 셋째»라는 뜻인데 그 여덟 개는 화면에
 * 없고, 카드에도 3·7만 남으므로 «1·2는 어디 갔나»가 남는다. 표기로 바꾸면 문장 안에서 바로
 * 읽힌다 — 이 기능의 값이 출처이고, 출처는 읽혀야 값이다.
 *
 * ── 왜 다 받은 뒤에만 하는가 ────────────────────────────────
 * **치환하면 길이가 바뀐다.** 흘려보내는 동안에는 `[3]`이 조각 경계에 걸려 `[`와 `3]`으로 나뉘어
 * 오고(서버가 토큰 단위로 흘린다), 반쯤 온 대괄호를 갈아 그리면 다음 조각이 붙는 순간 문장이
 * 흔들린다. 그래서 **`done`으로 인용이 확정된 뒤에 한 번만** 부른다 — 흘려 받는 동안의 말풍선은
 * 번호를 그대로 그린다(`assistant-message.tsx`).
 *
 * ── 갈아 그리지 못하는 대괄호는 그대로 둔다 ─────────────────
 * 인용 목록에 없는 번호(`ref`가 짝을 이루지 못하는 것)와 `marker`가 빈 인용은 건드리지 않는다.
 * 서버가 범위 밖 번호를 본문에서 지우므로 이 자리는 계약상 비지만, 남는다면 **지우는 것보다
 * 남기는 편이 낫다** — 지우면 문장에서 근거가 통째로 사라지고 그것이 정상인지 사고인지 구별할
 * 수 없다.
 *
 * `[3]`에 붙은 공백은 건드리지 않는다. 모델이 «제7조에 따라[3] …»처럼 붙여 쓰기도 하고 띄기도
 * 하는데, 그 간격은 문장을 쓴 쪽의 것이다.
 */
export function withCitationMarkers(answer: string, citations: AssistantCitation[]): string {
  if (!answer || citations.length === 0) return answer;

  const markers = new Map<number, string>();
  for (const citation of citations) {
    if (citation.marker) markers.set(citation.ref, citation.marker);
  }
  if (markers.size === 0) return answer;

  /*
   * 여러 근거를 함께 단 `[3, 7]`·`[3][7]` 두 모양을 다 받는다. 번호 하나만 보는 정규식으로
   * 두면 앞의 것이 «갈아 그리지 못한 대괄호»로 남아 한 문장 안에 두 표기법이 섞인다.
   *
   * 뒤따르는 `(`를 함께 잡아 **마크다운 링크의 글자 부분은 건드리지 않는다** — `[3](주소)`를
   * 갈아 그리면 `[제7조](주소)`가 되어 인용이 링크로 둔갑한다. 규정 원문에는 주소가 없어
   * 모델이 그런 링크를 쓸 자리가 지금은 없지만, 본문이 `Markdown`을 지나가므로 **이 함수가
   * 마크다운 문법을 만들어 내지 않는다**는 것은 값싸게 못 박아 둘 만한 성질이다.
   */
  return answer.replace(/\[(\d+(?:\s*,\s*\d+)*)\](\(?)/g, (whole, group: string, paren: string) => {
    if (paren) return whole;
    const refs = group.split(",").map((ref) => Number(ref.trim()));
    const labels = refs.map((ref) => markers.get(ref));
    /* 하나라도 짝이 없으면 통째로 둔다 — 반만 갈아 그리면 무엇이 근거인지가 흐려진다 */
    if (labels.some((label) => label === undefined)) return whole;
    return `[${labels.join(", ")}]`;
  });
}
