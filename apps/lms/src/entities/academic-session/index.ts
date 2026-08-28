/*
 * 학술 회차 슬라이스 배럴.
 *
 * ⚠️ **서버 전용 조회 모듈은 여기서 재export 하지 않는다** — `api/sessions-read.ts`·
 * `api/attendances.ts`는 `apiFetchAuthed`(`next/headers`)를 타므로 클라이언트 번들에 끌려
 * 들어가면 빌드가 깨진다. SSR 로더(`features/academic-session/model/load-session-record.ts`)가
 * 그 파일들을 직접 임포트한다.
 *
 * 여기 실린 것은 전부 클라이언트에서도 안전하다 — 순수 타입·표시 함수·브라우저 전송 함수뿐이다.
 */

export type {
  AcademicAttendanceRow,
  AcademicSessionAttendance,
  AcademicSessionDetail,
  AcademicSessionFileReference,
  AcademicSessionSummary,
  AcademicSessionSummaryFilter,
  AttendanceCorrection,
  CurriculumItemWithSession,
  RosterSessionColumn,
  SesnSttsCd,
} from "./model/types";
export { allowsRecording } from "./model/types";

export { SESN_STTS_BADGE, sesnSttsBadge } from "./model/display";

export {
  attendanceRatePercent,
  formatAttendanceRate,
  isLowAttendanceRate,
  LOW_ATTENDANCE_RATE,
} from "./model/attendance-rate";

// 오류 코드는 전송 계층에 의존하지 않는 순수 모듈에 있다 (조회 함수는 재export 하지 않는다)
export { ACADEMIC_ATTENDANCE_ERROR, ACADEMIC_SESSION_ERROR } from "./api/error-codes";

export {
  resubmitAcademicSession,
  submitAcademicSession,
  type SessionSubmitBody,
} from "./api/sessions-write";

export { correctSessionAttendances } from "./api/attendances-correct";

export {
  fileExtOf,
  issueSessionPhotoTicket,
  putSessionPhoto,
  SESSION_PHOTO_ERROR,
  type SessionPhotoTicket,
} from "./api/file-reference";
