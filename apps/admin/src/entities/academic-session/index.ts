export type {
  AcademicProgramApproval,
  AcademicProgramApprovalFilter,
  AcademicSessionAttendance,
  AcademicSessionDetail,
  AcademicSessionFileReference,
  AcademicSessionSummary,
  SessionCrossListItem,
  SessionHistoryFilter,
  SessionHistoryPage,
  SessionReviewFilter,
  SessionReviewListPage,
  SessionTransition,
  SessionTransitionInput,
  SessionTransitionResult,
} from "./model/types";

/*
 * 출석률 판정은 `@ssccops/academic` 이 정본이다 (#698 · ssccops#516).
 *
 * 그전에는 이 슬라이스의 `model/attendance-rate.ts` 였고 lms 에 **글자까지 같은 사본**이
 * 있었다 — 두 파일이 각자 «한쪽을 고치면 다른 쪽도 함께 본다»고 적어 두고 사람이 지키던
 * 자리다. 화면 코드는 종전대로 이 배럴을 부른다.
 */
export {
  LOW_ATTENDANCE_RATE,
  attendanceRatePercent,
  formatAttendanceRate,
  isLowAttendanceRate,
} from "@ssccops/academic";

export {
  SESSION_REVIEW_ERROR,
  fetchAcademicProgramApprovals,
  fetchAcademicProgramSessions,
  fetchAcademicSession,
  fetchSessionAttendances,
  fetchSessionReviews,
  transitionSession,
} from "./api/sessions";
