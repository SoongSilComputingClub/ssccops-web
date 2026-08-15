export type {
  Mbr,
  MbrGrd,
  MbrStts,
  MbrRoleRel,
  MbrGrdHstry,
  MbrSttsHstry,
} from "./model/types";
export {
  useMbrStore,
  mbrGrdNm,
  mbrSttsNm,
  mbrGrdTone,
  mbrSttsTone,
  genNoText,
  generationText,
  isGraduate,
  currentRoleRels,
  rprsRoleRel,
} from "./model/store";
/*
 * 서버 계약 (ssccops-server #76). 위쪽 목 스토어와 이름이 겹치지 않는 것은 의도한 것이다 —
 * 근거는 api/members.ts 첫 주석.
 */
export {
  fetchMembers,
  fetchMember,
  fetchAssignableMembers,
  fetchMemberGrades,
  fetchMemberStatuses,
  MEMBER_ERROR,
} from "./api/members";
/* 회원 정보 수정 (#47 · 서버 #77) */
export {
  updateMember,
  updateMyProfile,
  MEMBER_FIELD_MAX,
  ACADEMIC_YEAR_MIN,
  ACADEMIC_YEAR_MAX,
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
