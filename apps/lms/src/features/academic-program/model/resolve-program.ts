import type { AcademicProgramSummary } from "@/entities/academic-program";
// 서버 전용 조회는 배럴이 재export 하지 않는다 — 직접 임포트한다
import { fetchMyAcademicPrograms } from "@/entities/academic-program/api/programs-read";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { toLeaderDashboardErrorMessage } from "./leader-dashboard-error";

/*
 * 활동을 특정하지 않고 들어온 화면(회차 기록·출석부·팀원 관리)의 활동 결정 (#190).
 *
 * ── 왜 필요한가 ────────────────────────────────────────────
 * 세 화면은 주소에 `?programId=`가 필요한데, 상단 바 메뉴는 활동을 특정할 수 없어 파라미터
 * 없이 열린다. 그전까지는 "대시보드에서 골라 오세요"로만 끝냈지만, 스터디장이 활동을 하나만
 * 맡은 경우가 대부분이라 그 한 건을 자동으로 골라 준다. 여러 건일 때만 고르게 한다 —
 * "임의로 활동 하나를 고르지 않는다"(routes.ts·#128·#131·#172)는 규칙은 **여러 건일 때**
 * 지킨다.
 *
 * ── 서버 전용 ────────────────────────────────────────────────
 * `fetchMyAcademicPrograms`가 `next/headers`(쿠키)를 타므로 이 모듈은 서버 컴포넌트에서만
 * 부를 수 있다. 세 화면의 SSR 셸이 직접 임포트한다.
 */

export type ProgramResolution =
  /** 활동 하나로 정해졌다 — 화면이 그 id로 본문을 그린다 */
  | { outcome: "resolved"; program: AcademicProgramSummary }
  /** 여러 건 — 화면이 고르는 목록을 그린다 */
  | { outcome: "choose"; programs: AcademicProgramSummary[] }
  /** 맡은 활동이 없다 */
  | { outcome: "none" }
  | { outcome: "unauthenticated" }
  | { outcome: "signup-required" }
  | { outcome: "error"; message: string };

/**
 * `?programId=`가 없을 때 `mine=true` 목록에서 활동을 결정한다.
 *
 * - 0건 → `none`
 * - 1건 → `resolved`(자동 선택)
 * - 2건+ → `choose`(화면이 목록을 그린다)
 */
export async function resolveProgram(): Promise<ProgramResolution> {
  try {
    const programs = await fetchMyAcademicPrograms();
    if (programs.length === 0) return { outcome: "none" };
    if (programs.length === 1) return { outcome: "resolved", program: programs[0] };
    return { outcome: "choose", programs };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    return { outcome: "error", message: toLeaderDashboardErrorMessage(error) };
  }
}
