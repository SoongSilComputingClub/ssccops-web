/*
 * 학술 활동 도메인이 분기에 쓰는 서버 오류 코드 — **순수 상수 모듈**(전송 계층 무의존).
 *
 * 조회(`programs-read.ts` · `members.ts` · 서버 컴포넌트)가 임포트한다. 화면은 `ApiError.code`
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
