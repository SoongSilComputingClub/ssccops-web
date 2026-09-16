/*
 * 규정 도우미 도메인 타입 (#433 · 서버 #403·#406 · 기획안 §6.3 · §13.1).
 *
 * **`entities/rag-document`와 나눈다.** 서버가 컨트롤러를 둘로 나눈 이유와 같다 — 코퍼스를
 * 바꾸는 쪽은 `RAG_DOCUMENT_MANAGE`이고 여기 묻는 쪽은 **인증만**이다. 한 슬라이스에 두면
 * 도우미 패널이 코퍼스 타입을 끌어오고, 그러면 «패널을 여는 데도 그 권한이 필요한가»가
 * 코드에서 흐려진다.
 */

/** 인용이 어느 모양인가 — **어느 필드가 채워졌는지를 이 값이 말한다**(서버 `CitationType`) */
export type CitationType = "ARTICLE" | "PAGE";

/**
 * 답변이 기댄 판본의 적용 상태 (서버 `RagApplyStatus`).
 *
 * 판본 배지가 쓰는 값이다. Phase 1의 검색 조건이 `EFFECTIVE`뿐이라 지금 내려오는 값은 언제나
 * 그것이지만 **화면 계약을 여기서 좁히지 않는다** — 좁히면 개정안을 상대로 묻는 길이 열릴 때
 * 「지금 회칙」과 「의결 전 개정안」의 답이 화면에서 같아 보인다(서버 DTO 주석과 같은 판단).
 */
export type AssistantApplyStatus = "DRAFT" | "EFFECTIVE" | "SUPERSEDED";

/**
 * 코퍼스가 지금 답할 수 있는 상태인가 (#463 · 서버 `AssistantCorpusState`).
 *
 * **추천 질문이 빈 배열인 것만으로는 갈리지 않던 두 상태를 서버가 갈라 준다.** 빈 배열은
 * «코퍼스가 정말 비었다»와 «문서는 있는데 시행 중인 것이 없다» 둘 다였고, 화면은 앞쪽으로만
 * 읽어 **이미 올린 문서를 올리라고** 말했다. 이 값을 목록이 아니라 추천 질문 응답에 실은 것은
 * 그쪽이 **인증만** 요구해서다 — 문서 목록·요약은 `RAG_DOCUMENT_MANAGE` 뒤에 있는데 패널은
 * 어디서나 열린다.
 *
 * ⚠️ **`NONE_EFFECTIVE`는 이름보다 넓다.** 검색 조건이 `INDEXED && EFFECTIVE` 두 축이라
 * «색인 중»·«색인 실패»·«내려둔 문서뿐»·«시행 중이지만 재색인 중»이 모두 이 값으로 온다.
 * 서버가 넷을 쪼개지 않은 것은 패널이 묻는 것이 «지금 물어도 되는가» 하나이기 때문이고
 * («왜 없는가»는 관리 목록이 문서마다 말한다), **그래서 화면 문구도 그 넷을 가르지 않는다.**
 */
export type AssistantCorpusState = "EMPTY" | "NONE_EFFECTIVE" | "READY";

/**
 * 추천 질문 조회의 결과 — **상태와 질문을 함께 받는다.**
 *
 * 질문만 돌려주면 부르는 쪽이 빈 배열의 뜻을 다시 유추해야 하고, 그 유추가 틀렸던 것이
 * #463이다. `READY`가 아닌 동안 `questions`는 언제나 빈 배열이다(서버 계약).
 */
export interface AssistantSuggestions {
  corpusState: AssistantCorpusState;
  questions: string[];
}

/**
 * 답변이 기댄 근거 하나.
 *
 * **두 모양이 한 타입에 있다.** `citationType`이 `ARTICLE`이면 `chapter`·`article`·`clause`·
 * `supplementary`가, `PAGE`면 `page`가 채워지고 **반대쪽은 `null`이다** — 서버가 대체값을
 * 만들지 않으므로 화면도 만들지 않는다(«없는 값을 지어내지 않는다» · AGENTS.md).
 *
 * `PAGE`인데 `page`가 비는 것도 **정상**이다 — DOCX에는 페이지가 없다(서버 #398). 그때 인용
 * 카드는 문서명까지만 그린다.
 *
 * **판본 번호(`docVer`)가 있던 자리다**(#462 · 서버 ADR-0034). 문서 한 건이 곧 그 규정이라
 * 카드에 「v1」을 그릴 것이 없고, 서버 DTO에도 그 필드가 없다 — 남겨 두었더니 `v${docVer}`가
 * `vundefined`로 굳어 화면에 찍혔다.
 */
export interface AssistantCitation {
  citationType: CitationType;
  docTitle: string | null;
  /** ARTICLE 전용 — `제2장 회원` */
  chapter: string | null;
  /**
   * ARTICLE 전용 — 부칙 여부.
   *
   * **이것이 없으면 `제1조`가 두 곳을 가리킨다**(부칙에서 조번호가 1로 리셋된다). `article`
   * 문자열에 «부칙 »이 붙어 있더라도 화면이 그 문자열을 파싱해 판단하지 않는다(서버 주석).
   */
  supplementary: boolean | null;
  /** ARTICLE 전용 — `제7조 (회원의 구분)` */
  article: string | null;
  /** ARTICLE 전용 — `6항` */
  clause: string | null;
  /** PAGE 전용 — `12`. **null이면 DOCX라 페이지가 없다는 뜻**이다 */
  page: number | null;
  /** 원문 발췌 — 인용이 이 기능의 값이라 카드마다 함께 그린다 */
  snippet: string | null;
}

/**
 * 질의 한 건의 답.
 *
 * **`answered`가 가장 중요한 필드다.** `false`면 서버가 모델을 부르지 않았거나 그 답을
 * 버렸다는 뜻이고, `answer`는 정해진 안내 문구, `citations`는 **빈 배열(null 아님)**,
 * 판본 값 둘은 `null`이다 — 기댄 판본이 없다.
 */
export interface AssistantAnswer {
  answer: string;
  citations: AssistantCitation[];
  /** 거절(`answered: false`)일 때는 null이다 */
  applyStatus: AssistantApplyStatus | null;
  /** 거절일 때, 그리고 `DRAFT`일 때 null이다(개정안에는 시행일이 없다) */
  effectiveDate: string | null;
  answered: boolean;
  /**
   * 이어 갈 대화 — **서버가 발급한다.** 화면은 받은 값을 다음 질문에 그대로 실을 뿐 만들지
   * 않는다. **거절일 때도 실려 온다** — 근거를 찾지 못한 첫 질문 뒤에 다시 묻는 것이 이
   * 기능의 흔한 사용이다.
   */
  conversationId: string | null;
}
