export { toAcademicProgramMembersErrorMessage } from "./model/members-error";
export {
  loadAcademicProgramMembers,
  type ProgramMembersLoad,
} from "./model/load-academic-program-members";
export { toLeaderDashboardErrorMessage } from "./model/leader-dashboard-error";
export {
  loadLeaderDashboard,
  type LeaderDashboardLoad,
  type LeaderDashboardReady,
} from "./model/load-leader-dashboard";
export {
  loadMyProgramDetail,
  type MyProgramDetailLoad,
  type MyProgramDetailReady,
  type MyProgramStats,
} from "./model/load-my-program-detail";
export {
  selectProgram,
  type ProgramSelection,
} from "./model/resolve-program";
export {
  BackToProgramsNotice,
  NoProgramNotice,
  ProgramSignupNotice,
} from "./ui/program-chooser";
/*
 * ⚠️ `ProgramSwitcher`(클라이언트)는 이 배럴에서 재export 하지 않는다 — 이 배럴은 SSR 로더
 * (`next/headers`)를 재export 하므로, 클라이언트가 배럴로 스위처를 가져오면 서버 모듈이
 * 딸려 온다. `@/features/academic-program/ui/program-switcher`에서 직접 임포트한다.
 */
