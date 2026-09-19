/*
 * 모집 폼 조회·저장이 돌려주는 서버 오류 코드 (#528 · ssccops-server#483).
 *
 * **전송 계층을 모르는 순수 모듈이다** — read(SSR)와 write(브라우저) 두 통로가 함께 쓴다
 * (`entities/academic-session/api/error-codes.ts`가 세운 규칙).
 *
 * 문구가 아니라 **코드로 분기한다**(AGENTS.md) — 서버 문구는 바뀌지만 코드는 계약이다.
 */
export const RECRUITMENT_FORM_ERROR = {
  /** 없는 활동 (404) */
  ACADEMIC_PROGRAM_NOT_FOUND: "ACADEMIC_PROGRAM_NOT_FOUND",
  /**
   * 이 활동에 연결된 모집 폼이 없다 (409).
   *
   * 기획안 승인 이관(서버 #150)이 폼을 붙여 주므로 정상 흐름에서는 나오지 않는다 —
   * 나오면 데이터 정합성이 깨진 것이라 화면에서 풀 길이 없고 담당자 문의로 안내한다.
   */
  FORM_NOT_LINKED: "FORM_NOT_LINKED",
  /**
   * 접수가 시작돼 문항을 고칠 수 없다 (409).
   *
   * **저장에서만 나온다** — 조회는 창이 닫혀도 200이고 `isEditable`만 false다. 화면이 이미
   * 그 값으로 잠그므로 여기까지 오는 것은 «편집 화면을 열어 둔 채 접수 시작 시각이 지난»
   * 경우다. 그래서 문구가 새로고침을 권한다.
   */
  RECRUITMENT_FORM_NOT_EDITABLE: "RECRUITMENT_FORM_NOT_EDITABLE",
  /** 문항 구성이 서버 규칙을 어겼다 (400 · `QuestionCompositionValidator`) */
  INVALID_QUESTION_COMPOSITION: "INVALID_QUESTION_COMPOSITION",
  /**
   * 이미 응답이 달린 문항을 지우거나 바꿨다 (409).
   *
   * 접수 전에만 고칠 수 있으므로 정상 흐름에서는 응답이 없다 — 접수 시작 직후의 경합에서만
   * 나온다.
   */
  QUESTION_ITEM_IN_USE: "QUESTION_ITEM_IN_USE",
  /** 이 활동의 리더도 학술국장도 아니다 (403) */
  FORBIDDEN: "FORBIDDEN",
} as const;
