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
