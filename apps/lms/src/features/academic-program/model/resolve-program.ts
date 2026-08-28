import type { AcademicProgramSummary } from "@/entities/academic-program";
// 서버 전용 조회는 배럴이 재export 하지 않는다 — 직접 임포트한다
import { fetchMyAcademicPrograms } from "@/entities/academic-program/api/programs-read";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { toLeaderDashboardErrorMessage } from "./leader-dashboard-error";

/*
 * 학술 화면(내 활동·회차 기록·출석부·팀원 관리)의 활동 선택 (#190 · #192).
 *
 * ── 왜 필요한가 ────────────────────────────────────────────
 * 네 화면 모두 활동 하나를 대상으로 그린다. 상단에 활동 선택 드롭다운을 두므로 SSR 셸은
 * **언제나 `mine=true` 목록 전체**를 알아야 하고(드롭다운 항목), 그중 지금 볼 활동
 * (`?programId=` 또는 목록 맨 위)을 골라 하단을 그린다.
 *
 * "임의로 활동 하나를 고르지 않는다"(routes.ts·#128·#131·#172)는 규칙은 **목록 맨 위를
 * 디폴트로** 쓰는 것으로 완화됐다(#192 결정) — 드롭다운으로 언제든 바꿀 수 있고 URL에
 * `?programId=`로 남으므로, 사용자가 무엇을 보고 있는지 모호하지 않다.
 *
 * ── 서버 전용 ────────────────────────────────────────────────
 * `fetchMyAcademicPrograms`가 `next/headers`(쿠키)를 타므로 이 모듈은 서버 컴포넌트에서만
 * 부를 수 있다. 네 화면의 SSR 셸이 직접 임포트한다.
 */

export type ProgramSelection =
  | {
      outcome: "ready";
      /** 드롭다운 항목 — 서버 정렬(등록 최신순) 그대로 */
      programs: AcademicProgramSummary[];
      /** 지금 볼 활동 — `?programId=`가 유효하면 그것, 아니면 목록 맨 위 */
      selected: AcademicProgramSummary;
    }
  /** 맡은 활동이 없다 */
  | { outcome: "none" }
  | { outcome: "unauthenticated" }
  | { outcome: "signup-required" }
  | { outcome: "error"; message: string };

/**
 * `mine=true` 목록을 받아 지금 볼 활동을 정한다.
 *
 * @param programId 주소의 `?programId=` (없거나 목록에 없으면 무시 → 맨 위)
 */
export async function selectProgram(
  programId: number | null,
): Promise<ProgramSelection> {
  try {
    const programs = await fetchMyAcademicPrograms();
    if (programs.length === 0) return { outcome: "none" };

    const selected =
      (programId != null &&
        programs.find((p) => p.academicProgramId === programId)) ||
      programs[0];

    return { outcome: "ready", programs, selected };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    return { outcome: "error", message: toLeaderDashboardErrorMessage(error) };
  }
}
