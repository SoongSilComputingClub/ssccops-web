/*
 * 학술 활동 도메인이 분기에 쓰는 서버 오류 코드 — **순수 상수 모듈**(전송 계층 무의존).
 *
 * 조회(`programs-read.ts` · `members.ts` · 서버 컴포넌트)와 팀원 쓰기의 오류 매핑(브라우저)이 함께
 * 임포트한다 — 그래서 전송 계층을 모르는 이 파일에 둔다. 화면은 `ApiError.code`
 * 로만 분기한다(#29 · AGENTS.md — 문구는 서버에서 바뀌지만 코드는 계약이다).
 * `entities/academic-session/api/error-codes.ts`와 같은 자리다.
 */

/** 활동 목록 조회가 돌려주는 오류 코드 (서버 `AcademicProgramErrorCode`). */
export const ACADEMIC_PROGRAM_LIST_ERROR = {
  /** 커서 형식·정렬 불일치 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 기준 코드에 없는 값 (400) — sttsCd·sort 파라미터가 어긋났을 때 */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
} as const;

/**
 * 팀원 명단·추가·상태 변경·이력이 돌려주는 오류 코드 (#131 · #742 · server#612).
 *
 * 조회(`members.ts`)에 있던 것을 이리로 옮겼다 — 쓰기 오류를 매핑하는 브라우저 모듈이 서버 전용
 * 조회 파일을 임포트하면 `next/headers`가 클라이언트 번들로 끌려온다.
 *
 * 서버 판정 순서: 활동 404 → 자격 403 → 종료·폐지 409 → 모집 시작 전 409 → (추가) 대상 400 ·
 * 중복 409 / (변경) 명단 행 404 → 전이 400.
 */
export const ACADEMIC_PROGRAM_MEMBER_ERROR = {
  /** 없는 활동 (404) */
  ACADEMIC_PROGRAM_NOT_FOUND: "ACADEMIC_PROGRAM_NOT_FOUND",
  /** 커서·정렬·본문 형식 오류 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 기준 코드에 없는 값 (400) — ptcpSttsCd 파라미터가 어긋났을 때 */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
  /** 스터디장 본인도 학술국장도 아니다 (403 · 추가·변경·이력) */
  FORBIDDEN: "FORBIDDEN",
  /** 종료된 활동 (409 · ADR-0057) */
  ACADEMIC_PROGRAM_COMPLETED: "ACADEMIC_PROGRAM_COMPLETED",
  /** 폐지된 활동 (409 · ADR-0058) */
  ACADEMIC_PROGRAM_DISCONTINUED: "ACADEMIC_PROGRAM_DISCONTINUED",
  /** 모집 시작 전 활동 (409) — 명단은 모집을 시작한 뒤에 바꾼다 */
  RECRUITMENT_NOT_STARTED: "RECRUITMENT_NOT_STARTED",
  /** 넣을 수 없는 회원 (400) — 탈퇴·제명·없는 회원을 한 코드로 묶는다(누가 떠났는지 새지 않게) */
  MEMBER_NOT_ADDABLE: "MEMBER_NOT_ADDABLE",
  /** 이미 확정·대기인 회원을 추가 (409) */
  EVENT_PARTICIPANT_DUPLICATED: "EVENT_PARTICIPANT_DUPLICATED",
  /** 이 활동의 명단 행이 아니다 (404) */
  EVENT_PARTICIPANT_NOT_FOUND: "EVENT_PARTICIPANT_NOT_FOUND",
  /** 전이표에 없는 상태 변경 (400) — 대기에서 곧바로 제외하는 등 */
  INVALID_PARTICIPANT_STATUS_TRANSITION: "INVALID_PARTICIPANT_STATUS_TRANSITION",
} as const;

/**
 * 소개 글(행사 게시물) 조회·저장이 돌려주는 오류 코드 (#819 · ADR-0069 · 서버 #699).
 *
 * 서버 판정 순서: 프로그램 404 → 리더 403 → 수료·폐지 409 → 접수 종료 409 → 본문 검증 400 · 413.
 */
export const EVENT_POST_ERROR = {
  /** 없는 프로그램 (404) */
  ACADEMIC_PROGRAM_NOT_FOUND: "ACADEMIC_PROGRAM_NOT_FOUND",
  /** 그 프로그램의 리더가 아니다 (403) — 학술국장도 이 경로를 쓰지 않는다(관리자 페이지 행사 편집) */
  FORBIDDEN: "FORBIDDEN",
  /**
   * 접수가 끝난 프로그램 (409). **저장·이미지 발급에서만 나온다** — 조회는 `isEditable: false`로
   * 온다. 화면을 열어 둔 사이 잠긴 경우다.
   */
  ACADEMIC_PROGRAM_EVENT_POST_LOCKED: "ACADEMIC_PROGRAM_EVENT_POST_LOCKED",
  /** 수료된 프로그램 (409 · ADR-0057) — 학술 쓰기 경로 공통 코드라 소개 글도 이 코드로 온다 */
  ACADEMIC_PROGRAM_COMPLETED: "ACADEMIC_PROGRAM_COMPLETED",
  /** 폐지된 프로그램 (409 · ADR-0058) — 위와 같다 */
  ACADEMIC_PROGRAM_DISCONTINUED: "ACADEMIC_PROGRAM_DISCONTINUED",
  /** 본문 10만 자 초과 (413) — 관리자 페이지 행사 저장과 같은 규칙 */
  EVENT_CONTENT_TOO_LARGE: "EVENT_CONTENT_TOO_LARGE",
  /** 길이·필수 위반 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
} as const;

/** 소개 글 이미지 업로드 오류 코드 — 서버 두 개는 어드민 행사 이미지와 같다. PUT_FAILED는 R2 구간 */
export const EVENT_POST_IMAGE_ERROR = {
  /** 400 — 서버가 허용하지 않는 형식(허용 목록은 서버에만 있다) */
  UNSUPPORTED_IMAGE_TYPE: "UNSUPPORTED_IMAGE_TYPE",
  /** 413 — 서버 용량 상한 초과 */
  IMAGE_TOO_LARGE: "IMAGE_TOO_LARGE",
  /** R2 구간 실패 — 서버가 준 코드가 아니라 클라이언트가 붙인다 */
  PUT_FAILED: "CLIENT_IMAGE_PUT_FAILED",
} as const;
