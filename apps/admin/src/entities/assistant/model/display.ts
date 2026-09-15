import type { AssistantAnswer, AssistantCitation } from "./types";

/*
 * 인용 카드와 판본 배지의 표시 규칙 (#433 · 기획안 §6.3 · §13.1).
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

/** 인용 카드의 보조 줄 — 조항 인용은 문서명이, 페이지 인용은 제목 줄이 이미 문서명을 말한다 */
export function citationSource(citation: AssistantCitation): string | null {
  const version = citation.docVer === null ? null : `v${citation.docVer}`;
  if (citation.citationType === "ARTICLE") {
    return [citation.docTitle, version].filter(Boolean).join(" ") || null;
  }
  return version;
}

/**
 * 답변 위의 판본 배지 — «2026-03-24 시행 회칙 기준» · «의결 전 개정안 기준».
 *
 * **두 답이 화면에서 같아 보이면 안 된다**(§13.1). 거절이면 기댄 판본이 없으므로 null이고,
 * 그때 화면은 배지를 그리지 않는다.
 *
 * 문서명은 **첫 인용의 것**을 쓴다 — 서버가 판본 값을 그렇게 정하고(유사도 순서 그대로),
 * 배지가 답하는 물음이 «어느 판본을 기준으로 읽었나» 하나이기 때문이다.
 */
export function versionBadgeLabel(answer: AssistantAnswer): string | null {
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
   * 옛 판본이다. Phase 1의 검색 조건이 `EFFECTIVE`뿐이라 지금 이 값은 내려오지 않지만,
   * `EFFECTIVE`와 같은 문장으로 흘리면 **대체된 회칙의 답이 지금 회칙의 답처럼 보인다** —
   * DRAFT를 가르는 이유와 같은 이유라 같은 자리에서 가른다.
   */
  if (answer.applyStatus === "SUPERSEDED") {
    const superseded = answer.effectiveDate ? `${answer.effectiveDate} 시행 ` : "";
    return `${superseded}${docTitle ?? ""} 옛 판본 기준`.replace(/\s+/g, " ").trim();
  }

  const effective = answer.effectiveDate ? `${answer.effectiveDate} 시행` : null;
  return [effective, docTitle, "기준"].filter(Boolean).join(" ");
}
