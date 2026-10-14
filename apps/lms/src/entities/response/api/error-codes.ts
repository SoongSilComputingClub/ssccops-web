/*
 * 폼 응답 도메인이 분기에 쓰는 서버 오류 코드 — **순수 상수 모듈**(전송 계층 무의존).
 *
 * 조회(`system-form.ts`·`my-responses.ts`·`my-response-detail.ts` · 서버 컴포넌트)와
 * 재제출(`response-submit.ts` · 브라우저)이 함께 임포트한다. 화면은 `ApiError.code`로만
 * 분기한다(AGENTS.md — 문구는 서버에서 바뀌지만 코드는 계약이다). 어드민
 * `entities/form`의 `PUBLIC_FORM_ERROR`·`entities/response`의 `RESPONSE_ERROR`에서 이 앱이
 * 실제로 만나는 코드만 옮겼다.
 */

/** 폼·응답 조회/재제출이 돌려주는 서버 오류 코드 (`FormErrorCode`). */
export const RESPONSE_ERROR = {
  /**
   * 없는 폼 — 시스템 폼 코드가 아직 시드되지 않았을 때도 이 코드다.
   *
   * **서버 enum 이름은 `FORM_NOT_FOUND`지만 응답 본문에 실리는 `code` 문자열은 `"NOT_FOUND"`다**
   * (`FormErrorCode.FORM_NOT_FOUND`의 두 번째 인자 · 컨트롤러 테스트가 `$.code == "NOT_FOUND"`로
   * 못박아 뒀다). 이름으로 짐작해 분기하면 영원히 맞지 않는다 — 어드민 `entities/form`도 같은
   * 자리에서 이 값을 쓴다.
   */
  FORM_NOT_FOUND: "NOT_FOUND",
  /**
   * 없는 응답 · **본인 행이 아닌 응답**도 같은 코드로 온다 (서버 #177).
   * 존재 여부가 새지 않게 하려는 것이라 화면은 둘을 똑같이 "찾을 수 없음"으로 다룬다.
   */
  FORM_RESPONSE_NOT_FOUND: "FORM_RESPONSE_NOT_FOUND",
  /**
   * 반려된 응답을 다시 내려 했다 (서버 #141). `RESPONSE_ALREADY_SUBMITTED`와 코드를 나눴다 —
   * "이미 제출했다"는 기다리라는 뜻이지만 반려는 끝났다는 뜻이라, 같은 문구면 오지 않을
   * 결과를 기다리게 된다.
   */
  RESPONSE_ALREADY_REJECTED: "RESPONSE_ALREADY_REJECTED",
  /** 이미 제출을 마친 응답(단일 응답 폼) — 다른 창에서 냈거나 버튼이 두 번 눌렸다 */
  RESPONSE_ALREADY_SUBMITTED: "RESPONSE_ALREADY_SUBMITTED",
  /**
   * 지금 응답을 받지 않는 폼 (DRAFT·마감·기간 밖).
   *
   * **수정요청받은 응답의 재제출은 이 판정에 막히지 않는다**(서버 #177) — 그래도 코드를 두는
   * 것은 그 사이 폼 상태가 바뀌었을 때(예: 운영진이 폼을 되돌림) 대비다.
   */
  FORM_NOT_ACCEPTING: "FORM_NOT_ACCEPTING",
  /** 폼에 없는 qitemId가 섞였다 — 폼 문항이 바뀐 뒤 옛 화면으로 낸 경우 */
  UNKNOWN_QUESTION_ITEM: "UNKNOWN_QUESTION_ITEM",
  /** 문항 유형과 맞지 않는 값 */
  INVALID_ANSWER_VALUE: "INVALID_ANSWER_VALUE",
  /** 필수 문항이 비었다 */
  REQUIRED_ANSWER_MISSING: "REQUIRED_ANSWER_MISSING",
  /** 정규식 형식 불일치 */
  ANSWER_PATTERN_MISMATCH: "ANSWER_PATTERN_MISMATCH",
  /** 다중선택 최대 선택 수 초과 */
  ANSWER_SELECTION_LIMIT_EXCEEDED: "ANSWER_SELECTION_LIMIT_EXCEEDED",
  /**
   * 초안 저장이 동시에 도착해 부딪혔다 (409) — 서버가 명시적으로 재시도를 요구하는 유일한
   * 409다(첫 저장이 겹친 경우). 다른 409(`RESPONSE_ALREADY_*`)와 달리 다시 보내면 풀린다.
   */
  RESPONSE_SAVE_CONFLICT: "RESPONSE_SAVE_CONFLICT",
} as const;

/**
 * 기획안 첨부 자료가 돌려주는 서버 오류 코드 (server#685 · `FormErrorCode`).
 *
 * 형식·총량·개수·잠김의 **판정과 문장은 서버 몫이다**(lms AGENTS — 웹은 파일 형식·크기를 검사하지
 * 않는다). 총량 초과(413)의 메시지에는 남은 용량이 실려 오므로 화면은 그 문장을 그대로 보인다.
 */
export const PROPOSAL_ATTACHMENT_ERROR = {
  /** 400 — pdf·txt·md가 아님 */
  UNSUPPORTED_TYPE: "PROPOSAL_ATTACHMENT_UNSUPPORTED_TYPE",
  /** 413 — 합계 상한을 넘음(메시지에 남은 용량) */
  TOO_LARGE: "PROPOSAL_ATTACHMENT_TOO_LARGE",
  /** 409 — 개수 상한 */
  LIMIT_EXCEEDED: "PROPOSAL_ATTACHMENT_LIMIT_EXCEEDED",
  /** 409 — 응답이 작성 중(접수 중)·수정요청이 아니다 */
  LOCKED: "PROPOSAL_ATTACHMENT_LOCKED",
  /** 400 — 기획안 시스템 폼의 응답이 아님 */
  NOT_SUPPORTED: "PROPOSAL_ATTACHMENT_NOT_SUPPORTED",
  /** 404 — 그 응답에 없는 fileId */
  NOT_FOUND: "PROPOSAL_ATTACHMENT_NOT_FOUND",
  /**
   * 브라우저 → R2 PUT 실패 — 서버가 준 코드가 아니라 화면이 붙인다(`CLIENT_*` 관례 · 출석
   * 인증사진의 `CLIENT_PHOTO_PUT_FAILED`와 같다).
   */
  PUT_FAILED: "CLIENT_PROPOSAL_ATTACHMENT_PUT_FAILED",
  /** 올릴 대상(초안)을 만들지 못했다 — 서버가 초안 식별자 없이 답한 경우. 화면이 붙인다 */
  TARGET_UNAVAILABLE: "CLIENT_PROPOSAL_ATTACHMENT_TARGET_UNAVAILABLE",
} as const;
