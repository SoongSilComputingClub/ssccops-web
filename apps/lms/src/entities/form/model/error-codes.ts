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
  /**
   * 종료된 프로그램의 문항을 고치려 했다 (409 · ADR-0057 · 서버 #597).
   *
   * 이것도 **저장에서만 나온다** — 조회는 `isEditable: false`로 온다. 편집 화면을 열어 둔 사이
   * 종료된 경우다.
   */
  ACADEMIC_PROGRAM_COMPLETED: "ACADEMIC_PROGRAM_COMPLETED",
  /** 폐지된 프로그램의 문항을 고치려 했다 (409 · ADR-0058 · 서버 #611) — 종료와 같은 자리에서 온다 */
  ACADEMIC_PROGRAM_DISCONTINUED: "ACADEMIC_PROGRAM_DISCONTINUED",
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

/**
 * 지원자 목록·지원서 상세가 돌려주는 서버 오류 코드 (#826 · ssccops#625 · server#704).
 *
 * 서버 판정 순서: 프로그램 404 → 자격 403 → 모집 시작 전 409 → 폼 미연결 409 → (상세) 응답 404.
 * 자격은 목록이 «리더 또는 학술 조회 권한», 상세가 «리더 한 사람»이다(ADR-0068 — 국원에게는
 * 기획안 응답만 열었다). 둘 다 403 `FORBIDDEN`으로 온다.
 */
export const RECRUITMENT_APPLICATION_ERROR = {
  /** 없는 프로그램 (404) */
  ACADEMIC_PROGRAM_NOT_FOUND: "ACADEMIC_PROGRAM_NOT_FOUND",
  /** 이 프로그램의 리더가 아니다 (403) */
  FORBIDDEN: "FORBIDDEN",
  /**
   * 모집을 시작하기 전이다 (409). 빈 배열이 아니라 오류인 것은 빈 목록이 «아무도 지원하지 않았다»로
   * 읽히기 때문이다(서버 주석). 카드가 그 구간에 링크를 감추므로 주소를 직접 쳐야 온다.
   */
  RECRUITMENT_NOT_STARTED: "RECRUITMENT_NOT_STARTED",
  /** 연결된 모집 폼이 없다 (409) — 승인 이관이 붙여 주므로 정상 흐름에서는 나오지 않는다 */
  FORM_NOT_LINKED: "FORM_NOT_LINKED",
  /**
   * 그 지원서가 없다 (404 · 상세만). 다른 폼의 응답 번호와 작성 중(DRAFT) 응답도 같은 코드다 —
   * 그 폼에 그 번호가 있는지 없는지를 알려주지 않는다.
   */
  FORM_RESPONSE_NOT_FOUND: "FORM_RESPONSE_NOT_FOUND",
} as const;
