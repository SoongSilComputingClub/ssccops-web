import type { AcademicProgramSummary } from "@/entities/academic-program";
// 서버 전용 조회는 배럴이 재export 하지 않는다(클라이언트 번들 오염 방지) — 직접 임포트한다
import { fetchMyAcademicPrograms } from "@/entities/academic-program/api/programs-read";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { toLeaderDashboardErrorMessage } from "./leader-dashboard-error";

/*
 * 내 활동 목록(`/studio/programs`)의 SSR 로더 (#188 · 서버 #131).
 *
 * ── 대시보드와 무엇이 다른가 ────────────────────────────────
 * 대시보드(`/studio`)는 `mine=true` 목록에서 **진행 중 활동 하나**를 골라 그린다. 이 화면은
 * 같은 목록을 **전부** 보여 준다 — "지금 뭘 해야 하나"가 아니라 "내가 맡은 활동이 무엇무엇
 * 인가"다. 그래서 로더가 하는 일은 목록 조회와 오류 분기뿐이고, 집계·선택은 없다.
 *
 * ── 왜 훅이 아니라 로더인가 ──────────────────────────────────
 * 이 앱은 조회 화면을 서버 컴포넌트로 그린다(AGENTS.md · 대시보드·팀원 관리와 같은 규약) —
 * 쿠키의 Supabase 세션을 서버에서 읽어 토큰을 브라우저 코드에 싣지 않는다. 목록은 카드를
 * 눌러 상세로 가기만 하므로 클라이언트 훅이 없다.
 *
 * ── 오류 문구는 대시보드와 한 벌을 쓴다 ────────────────────────
 * 같은 엔드포인트(`GET /v1/academic-programs?mine=true`)라 오류 코드가 같다 — 문구를 두 벌
 * 두면 갈린다. 401·미가입은 여기서 문구를 만들지 않고 페이지가 게이트로 그린다(www 규약).
 */

export type MyProgramsLoad =
  | { outcome: "ready"; programs: AcademicProgramSummary[] }
  /** 미로그인·토큰 만료 — 페이지가 `LoginGate`를 그린다 */
  | { outcome: "unauthenticated" }
  /** 로그인은 됐지만 미가입 — 페이지가 어드민 `/signup` 안내를 그린다 */
  | { outcome: "signup-required" }
  /** 그 밖의 실패(네트워크 등) — 페이지가 문구를 그린다 */
  | { outcome: "error"; message: string };

export async function loadMyPrograms(): Promise<MyProgramsLoad> {
  try {
    const programs = await fetchMyAcademicPrograms();
    return { outcome: "ready", programs };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    return { outcome: "error", message: toLeaderDashboardErrorMessage(error) };
  }
}
