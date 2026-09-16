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
 * `ARTICLE`이면 «제2장 회원 · 제7조 (회원의 구분) 6항», `PAGE`면 «2026 지원금 집행 지침 p.12».
 * **한 답변에 둘이 섞이는 것이 정상이다** — 회칙이 세부 규정을 다른 문서에 위임한다.
 *
 * 빈 조각은 넣지 않는다. `p.`만 남은 «지침 p.» 같은 문자열을 만들지 않기 위해서다.
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

    const parts = [citation.chapter, [article, citation.clause].filter(Boolean).join(" ")];
    const label = parts.filter(Boolean).join(" · ");
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
 * 조항 카드의 제목 줄은 «제2장 회원 · 제7조 6항»이라 어느 문서의 제7조인지를 말하지 않는다.
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
 * 답변 위의 근거 배지 — «2026-03-24 시행 회칙 기준» · «의결 전 개정안 기준».
 *
 * **두 답이 화면에서 같아 보이면 안 된다**(§13.1). 거절이면 기댄 문서가 없으므로 null이고,
 * 그때 화면은 배지를 그리지 않는다.
 *
 * 문서명은 **첫 인용의 것**을 쓴다 — 서버가 적용 상태를 그렇게 정하고(유사도 순서 그대로),
 * 배지가 답하는 물음이 «무엇을 근거로 읽었나» 하나이기 때문이다.
 *
 * **«판본 배지»였다**(#462 · 서버 ADR-0034). 판본 개념이 없어진 뒤 이 배지가 답하는 것은
 * «몇 번째 판이냐»가 아니라 **문서의 적용 상태**(개정안 · 시행 중 · 내려둠)다 — 이름에 판본이
 * 남아 있으면 없어진 축을 되살리는 코드가 다시 붙는다.
 */
export function basisBadgeLabel(answer: AssistantAnswer): string | null {
  if (!answer.answered || answer.applyStatus === null) return null;

  const docTitle = answer.citations[0]?.docTitle ?? null;

  /*
   * DRAFT는 시행일이 없다. 날짜 자리를 비운 «시행 기준»으로 흘리지 않고 문장을 통째로 바꾸는
   * 것은, 「지금 회칙」과 「의결 전 개정안」이 한눈에 갈려야 하기 때문이다.
   */
  if (answer.applyStatus === "DRAFT") {
    return [docTitle, "의결 전 개정안 기준"].filter(Boolean).join(" ");
  }

  /*
   * 내려둔 문서다. Phase 1의 검색 조건이 `EFFECTIVE`뿐이라 지금 이 값은 내려오지 않지만,
   * `EFFECTIVE`와 같은 문장으로 흘리면 **내려둔 회칙의 답이 지금 회칙의 답처럼 보인다** —
   * DRAFT를 가르는 이유와 같은 이유라 같은 자리에서 가른다.
   *
   * 문구는 규정 설정 화면의 상태 표시명과 같은 말을 쓴다(«내려둠» — `entities/rag-document`).
   * «옛 판본»이라고 적던 자리인데, 그 말은 ADR-0034가 걷어낸 축을 가리킨다.
   */
  if (answer.applyStatus === "SUPERSEDED") {
    const superseded = answer.effectiveDate ? `${answer.effectiveDate} 시행 ` : "";
    return `${superseded}${docTitle ?? ""} 내려둔 문서 기준`.replace(/\s+/g, " ").trim();
  }

  const effective = answer.effectiveDate ? `${answer.effectiveDate} 시행` : null;
  return [effective, docTitle, "기준"].filter(Boolean).join(" ");
}
