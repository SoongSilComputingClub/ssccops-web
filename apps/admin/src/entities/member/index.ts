/*
 * 회원 엔티티.
 *
 * 목 스토어(`model/store.ts`)와 시드(`api/get-mbr*.json`), 그리고 그것이 쓰던 데이터사전 표기
 * 타입(`Mbr`·`MbrGrd` …)은 #54에서 지웠다 — 회원 화면은 전부 서버 계약 위에서 돈다.
 * 남은 것은 서버 API와, 코드값에 딸린 표시 규칙(`model/display.ts`)뿐이다.
 */

/* 표시 규칙 — 근거는 model/display.ts 첫 주석 */
export {
  mbrGrdNm,
  mbrSttsNm,
  mbrGrdTone,
  mbrSttsTone,
  generationText,
  clubJoinPeriodText,
} from "./model/display";
/* 서버 계약 (ssccops-server #76) */
export {
  fetchMembers,
  fetchMember,
  fetchAssignableMembers,
  fetchMemberGrades,
  fetchMemberStatuses,
  MEMBER_ERROR,
} from "./api/members";
/* 동아리 가입 연도 → 기수 (#214) — 계산식은 서버에만 있다 */
export { fetchGenerationNumber } from "./api/members";
/* 회원 정보 수정 (#47 · 서버 #77) */
export {
  updateMember,
  updateMyProfile,
  MEMBER_FIELD_MAX,
  ACADEMIC_YEAR_MIN,
  ACADEMIC_YEAR_MAX,
  CLUB_JOIN_MONTH_MIN,
  CLUB_JOIN_MONTH_MAX,
} from "./api/members";
export type { MemberUpdateInput, MemberSelfUpdateInput } from "./api/members";
/* 등급·상태 변경 (#48 · 서버 #78) — 이력을 남기는 전용 경로다 */
export {
  changeMemberGrade,
  changeMemberStatus,
  statusAllowsExpectedEndDate,
  CHANGE_REASON_MAX,
  MEMBER_CHANGE_WARNING,
} from "./api/members";
export type {
  MemberChangeResult,
  MemberChangeWarning,
  MemberGradeChangeInput,
  MemberStatusChangeInput,
} from "./api/members";
/*
 * 회원 역할 부여·종료 (#50 · 서버 #81).
 *
 * 요구 권한이 `ROLE_MANAGE`라 회원 API(`MEMBER_MANAGE`)와 파일이 갈린다 — 근거는
 * api/member-roles.ts 첫 주석.
 */
export {
  fetchMemberRoles,
  assignMemberRole,
  updateMemberRole,
  overlapsAssignment,
  MEMBER_ROLE_ERROR,
} from "./api/member-roles";
export type {
  MemberRoleAssignment,
  MemberRoleAssignInput,
  MemberRoleUpdateInput,
} from "./api/member-roles";
/*
 * CSV 회원 이관 (#57 · 서버 #84·#85).
 *
 * multipart/form-data라 전송 경로가 다르고(`apiUpload`) 요구 권한도 `MEMBER_MANAGE`로 회원
 * API와 같지만, 파일이 API 경계를 넘나드는 유일한 자리라 파일을 나눠 두었다.
 */
export {
  previewMemberImport,
  validateMemberImport,
  executeMemberImport,
  checkMemberImportFile,
  memberImportFieldLabel,
  MEMBER_IMPORT_FIELDS,
  MEMBER_IMPORT_ERROR,
  MEMBER_IMPORT_MAX_FILE_SIZE,
} from "./api/member-imports";
export type {
  MemberImportFieldKey,
  MemberImportFieldOption,
  MemberImportMapping,
  MemberImportPreview,
  MemberImportValidation,
  MemberImportValidationSummary,
  MemberImportRowResult,
  MemberImportRowStatus,
  MemberImportRowIssue,
  MemberImportExecution,
  MemberImportExecutionSummary,
  MemberImportExecutionRow,
  MemberImportExecutionStatus,
} from "./api/member-imports";

/*
 * 회원 변경 이력 통합 조회 (#51 · 서버 #82).
 *
 * 요구 권한은 회원 조회와 같은 `MEMBER_MANAGE`지만 응답의 nullable 자리가 상세의 '최근 변경'과
 * 달라 타입을 따로 둔다 — 근거는 api/member-histories.ts 첫 주석.
 */
export {
  fetchMemberHistories,
  historyTypeOf,
  MEMBER_HISTORY_TYPES,
} from "./api/member-histories";
export type {
  MemberHistoryEntry,
  MemberHistoryFilter,
  MemberHistoryType,
  MemberHistoryChangeType,
} from "./api/member-histories";
export type {
  AssignableMember,
  MemberSummary,
  MemberDetail,
  MemberChange,
  MemberChangeType,
  MemberRoleRef,
  MemberGradeOption,
  MemberStatusOption,
  MemberListFilter,
  MemberListPage,
  MemberSortParam,
} from "./api/members";
