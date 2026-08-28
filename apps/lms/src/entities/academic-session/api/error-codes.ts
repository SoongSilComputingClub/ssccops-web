/*
 * 회차 도메인이 분기에 쓰는 서버 오류 코드 — **순수 상수 모듈**(전송 계층에 의존하지 않는다).
 *
 * 조회(`sessions-read.ts` · 서버)·제출(`sessions-write.ts`·`file-reference.ts` · 브라우저)이
 * 함께 임포트한다. 화면은 `ApiError.code`로만 분기한다(#29 · AGENTS.md — 문구는 서버에서 바뀌지만
 * 코드는 계약이다).
 */

/** 회차 기록·커리큘럼 조회/제출이 돌려주는 오류 코드 (서버 `AcademicProgramErrorCode`). */
export const ACADEMIC_SESSION_ERROR = {
  /** 없는 활동 (404) */
  ACADEMIC_PROGRAM_NOT_FOUND: "ACADEMIC_PROGRAM_NOT_FOUND",
  /** 그 활동의 것이 아닌 curriculumItemId (404) — 없는 것과 남의 것을 서버가 한 코드로 묶는다 */
  CURRICULUM_ITEM_NOT_FOUND: "CURRICULUM_ITEM_NOT_FOUND",
  /** 없는 sessionId이거나 다른 활동에 속한 회차 (404) */
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  /** 이미 실적이 있는 커리큘럼 항목에 신규 제출(POST) (409) */
  SESSION_ALREADY_EXISTS: "SESSION_ALREADY_EXISTS",
  /** 지금 쓸 수 있는 상태가 아닌 회차에 재제출(PUT) (409) */
  SESSION_NOT_EDITABLE: "SESSION_NOT_EDITABLE",
  /** attendances에 확정 팀원이 아닌 대상이 있거나 같은 참가자가 중복 (400) */
  INVALID_ATTENDANCE_TARGET: "INVALID_ATTENDANCE_TARGET",
  /** 스터디장 본인이 아님 (403) */
  FORBIDDEN: "FORBIDDEN",
  /** 필수 필드 누락·형식 오류 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
} as const;

/** 출석 조회·정정이 돌려주는 오류 코드. */
export const ACADEMIC_ATTENDANCE_ERROR = {
  /** 없는 활동 (404) */
  ACADEMIC_PROGRAM_NOT_FOUND: "ACADEMIC_PROGRAM_NOT_FOUND",
  /** 없는 sessionId이거나 다른 활동에 속한 회차 (404) */
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  /** 승인 완료(APPROVED)된 회차의 출석을 고치려 함 (409) */
  SESSION_NOT_EDITABLE: "SESSION_NOT_EDITABLE",
  /** 그 회차 출석부에 줄이 없는 참가자거나 중복 (400) */
  INVALID_ATTENDANCE_TARGET: "INVALID_ATTENDANCE_TARGET",
  /** 스터디장 본인이 아님 (403) */
  FORBIDDEN: "FORBIDDEN",
} as const;
