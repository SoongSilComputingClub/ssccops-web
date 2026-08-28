import type { AcademicProgramSummary } from "@/entities/academic-program";
// 서버 전용 조회는 배럴이 재export 하지 않는다(클라이언트 번들 오염 방지) — 직접 임포트한다
import { fetchMyAcademicPrograms } from "@/entities/academic-program/api/programs-read";
import type {
  AcademicProgramApproval,
  CurriculumItemWithSession,
} from "@/entities/academic-session";
import { fetchAcademicProgramApprovals } from "@/entities/academic-session/api/approvals-read";
import { fetchCurriculumItems } from "@/entities/academic-session/api/sessions-read";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { isWithinThisWeek, todayInSeoul } from "@/shared/lib/date";
import { toLeaderDashboardErrorMessage } from "./leader-dashboard-error";

/*
 * 스터디장 대시보드(`/studio`)의 SSR 로더 (#126 · 서버 #131·#134·#139).
 *
 * ── 왜 훅이 아니라 로더인가 ──────────────────────────────────
 * 이 앱은 조회를 서버 컴포넌트로 그린다(AGENTS.md · apps/www·#131·#172와 같은 규약) — 쿠키의
 * Supabase 세션을 서버에서 읽어 토큰을 브라우저 코드에 싣지 않고, 읽기 전용 화면에 데이터
 * 페칭 상태 기계를 들이지 않는다. 대시보드는 상호작용이 없어(카드를 눌러 이동만 한다)
 * 클라이언트 훅을 둘 이유가 없다.
 *
 * ── 무엇을 모으는가 (이슈 「작업할 내용」) ──────────────────────
 * 1. 내 활동 목록(`?mine=true` · #131) — 그중 **진행 중(ONGOING) 활동 하나**를 대상으로 삼는다.
 *    없으면 승인(APPROVED)이나 첫 활동. 하나도 없으면 빈 상태.
 * 2. 그 활동의 커리큘럼(#134) — 회차 진행 스트립·미기록 회차·진행률의 재료.
 * 3. 그 활동의 회차 승인 이력(#139 · `aprvPntCd=SESSION`) — "내 기록 처리 현황".
 *
 * ── "본인 활동 1건"을 어떻게 고르는가 (#126 결정) ────────────────
 * `/studio`는 이 앱의 첫 화면이고 주소에 활동을 싣지 않는다(스터디장이 여러 활동을 맡아도
 * 대시보드는 지금 굴러가는 하나를 보여 준다). 여러 건이면 진행 중 활동 중 첫 번째(서버 정렬 =
 * 등록 최신순)를 고르고, 나머지는 카드로 함께 보여 준다 — 임의로 감추지 않는다. 국장이
 * 스터디장을 겸하는 경우 어드민(`/academic-programs/dashboard`)과 이 화면을 각자 오간다
 * (역할로 분기하는 코드를 넣지 않는다 · #126 결정).
 *
 * ── "이번 주"·"지연"은 뷰가 아니라 여기서 판정한다 (#126 결정) ────
 * 서버가 그 필터를 주지 않는다. 커리큘럼 항목의 `planYmd`를 `todayInSeoul()` 기준 이번 주
 * 범위로 거른다(로더가 한 번에 계산해 뷰에 넘긴다 — 같은 계산이 흩어지지 않게).
 *
 * ── 결과를 판별 유니온으로 돌려준다 ────────────────────────────
 * 페이지는 `outcome`으로 분기해 대시보드·로그인 게이트·가입 안내·오류·빈 상태 중 하나를
 * 그린다. 401·미가입을 오류 문구로 뭉개지 않는 것은 apps/www 규약이다.
 */

export interface LeaderDashboardReady {
  outcome: "ready";
  /** 대시보드가 지금 보여 주는 대상 활동 */
  program: AcademicProgramSummary;
  /** 그 활동의 커리큘럼(계획 + 실적 조인) — 회차 스트립·미기록·진행률의 재료 */
  curriculum: CurriculumItemWithSession[];
  /** 회차 승인 이력(최근순, SESSION 지점) — "내 기록 처리 현황" */
  approvals: AcademicProgramApproval[];
  /** 내가 맡은 다른 활동들 (대상 활동 제외) */
  otherPrograms: AcademicProgramSummary[];
  /** 이번 주(월~일) 안에 계획일이 잡힌 커리큘럼 항목 — 계획일 오름차순 */
  thisWeekItems: CurriculumItemWithSession[];
}

export type LeaderDashboardLoad =
  | LeaderDashboardReady
  /** 내가 맡은 활동이 하나도 없다 — 페이지가 빈 상태를 그린다 */
  | { outcome: "no-program" }
  /** 미로그인·토큰 만료 — 페이지가 `LoginGate`를 그린다 */
  | { outcome: "unauthenticated" }
  /** 로그인은 됐지만 미가입 — 페이지가 어드민 `/signup` 안내를 그린다 */
  | { outcome: "signup-required" }
  /** 그 밖의 실패(네트워크 등) — 페이지가 문구를 그린다 */
  | { outcome: "error"; message: string };

/** 대시보드가 볼 대상 활동 하나를 고른다 — 진행 중 > 승인 > 첫 번째 */
function pickPrimary(
  programs: AcademicProgramSummary[],
): AcademicProgramSummary | null {
  return (
    programs.find((p) => p.sttsCd === "ONGOING") ??
    programs.find((p) => p.sttsCd === "APPROVED") ??
    programs[0] ??
    null
  );
}

export async function loadLeaderDashboard(): Promise<LeaderDashboardLoad> {
  try {
    const programs = await fetchMyAcademicPrograms();
    const program = pickPrimary(programs);
    if (!program) return { outcome: "no-program" };

    // 커리큘럼과 승인 이력은 서로 독립이라 함께 부른다
    const [curriculum, approvals] = await Promise.all([
      fetchCurriculumItems(program.academicProgramId),
      // 승인 이력이 실패해도 나머지는 유효하다 — 빈 배열로 떨어뜨린다
      fetchAcademicProgramApprovals(program.academicProgramId).catch(() => []),
    ]);

    const today = todayInSeoul();
    const thisWeekItems = curriculum
      .filter((item) => isWithinThisWeek(item.planYmd, today))
      .sort((a, b) => (a.planYmd ?? "").localeCompare(b.planYmd ?? ""));

    return {
      outcome: "ready",
      program,
      curriculum,
      approvals,
      otherPrograms: programs.filter(
        (p) => p.academicProgramId !== program.academicProgramId,
      ),
      thisWeekItems,
    };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    return { outcome: "error", message: toLeaderDashboardErrorMessage(error) };
  }
}
