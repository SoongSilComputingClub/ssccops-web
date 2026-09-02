import type { AcademicProgramSummary } from "@/entities/academic-program";
// 서버 전용 조회는 배럴이 재export 하지 않는다 — 직접 임포트한다
import { fetchMyAcademicPrograms } from "@/entities/academic-program/api/programs-read";
import type {
  AcademicProgramApproval,
  AcademicSessionSummary,
  CurriculumItemWithSession,
} from "@/entities/academic-session";
import { fetchAcademicProgramApprovals } from "@/entities/academic-session/api/approvals-read";
import {
  fetchAcademicSessions,
  fetchCurriculumItems,
} from "@/entities/academic-session/api/sessions-read";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { todayInSeoul } from "@/shared/lib/date";
import { toLeaderDashboardErrorMessage } from "./leader-dashboard-error";

/*
 * 활동 하나의 상세(`/studio/programs/{id}`) SSR 로더 (#188 · 서버 #131·#134·#135·#139).
 *
 * ── 활동 단건을 어디서 얻는가 ──────────────────────────────
 * `GET /v1/academic-programs/{id}` 상세 엔드포인트가 있지만 **그 응답의 `progress`는 아직
 * 0으로 고정돼 있다**(서버 `AcademicProgramDetailResponse.of`가 `zero()`를 넣는다 — #135
 * 이전 시안). 진행률이 실제로 계산돼 오는 곳은 `?mine=true` **목록**의 `progressRatio`
 * 하나뿐이라, 대시보드가 목록에서 대상 활동을 고르는 것과 같은 방식으로 여기서도 목록에서
 * `academicProgramId`로 찾는다. 목록에 없으면 **내 활동이 아니거나 없는 활동**이므로
 * `not-found`로 가른다(어드민 `useAcademicProgramDetail`의 "없는 활동" 판단과 같다).
 *
 * ── 무엇을 모으는가 ────────────────────────────────────────
 * 1. 커리큘럼(#134) — 계획+실적 조인. "커리큘럼 대비 진행" 표와 진행률 근사의 재료.
 * 2. 회차 목록(#135) — 실제 `sesn` 행만. "회차 이력"과 완료 회차 수·평균 출석률의 재료.
 * 3. 회차 승인 이력(#139 · SESSION 지점) — 회차별 국장 처리 결과.
 * 셋은 서로 독립이라 함께 부른다.
 *
 * ── 집계는 여기서 한다 (#126·#172와 같은 규칙) ────────────────
 * 서버가 상세 요약을 주지 않으므로 진행률·완료 회차·평균 출석률·지연 회차를 이 로더가 한
 * 자리에서 계산해 넘긴다. "지연"은 `todayInSeoul()` 기준으로 계획일이 지난 미제출 회차다.
 * 출석 합계는 서버 `presentCount`/`totalCount`를 그대로 더한다(웹 재계산 금지 · #172).
 */

export interface MyProgramStats {
  /** 커리큘럼 항목 수 */
  curriculumTotal: number;
  /** 승인까지 끝난 회차 수 */
  approvedSessions: number;
  /** 실적이 기록된(제출 이상) 회차 수 */
  recordedSessions: number;
  /** 진행률 0~100 — 목록 응답의 progressRatio 우선, 없으면 승인/전체 근사 */
  progressPercent: number;
  /** 계획일이 지났는데 아직 실적이 없는(NOT_SUBMITTED) 회차 — 계획일 오름차순 */
  delayedItems: CurriculumItemWithSession[];
  /** 국장 검토 중(SUBMITTED·REVISION_REQUESTED)인 회차 수 */
  pendingReview: number;
  /**
   * 기록된 회차들의 평균 출석률(0~100) — 회차별 서버 합계의 합 / 합. 기록이 없으면 null
   * (0%로 그리면 "전원 결석"으로 읽힌다).
   */
  averageAttendancePercent: number | null;
}

export interface MyProgramDetailReady {
  outcome: "ready";
  program: AcademicProgramSummary;
  curriculum: CurriculumItemWithSession[];
  /** 실제 회차 기록 — 진행일 오름차순(조회가 그렇게 정렬해 준다) */
  sessions: AcademicSessionSummary[];
  /** 회차 승인 이력(최근순, SESSION 지점) */
  approvals: AcademicProgramApproval[];
  stats: MyProgramStats;
}

export type MyProgramDetailLoad =
  | MyProgramDetailReady
  /** 내 활동 목록에 없는 id — 없는 활동이거나 내가 맡지 않은 활동 */
  | { outcome: "not-found" }
  /** 미로그인·토큰 만료 — 페이지가 `LoginGate`를 그린다 */
  | { outcome: "unauthenticated" }
  /** 로그인은 됐지만 미가입 — 페이지가 어드민 `/signup` 안내를 그린다 */
  | { outcome: "signup-required" }
  /** 그 밖의 실패(네트워크 등) */
  | { outcome: "error"; message: string };

function deriveStats(
  program: AcademicProgramSummary,
  curriculum: CurriculumItemWithSession[],
  sessions: AcademicSessionSummary[],
  today: string,
): MyProgramStats {
  const curriculumTotal = curriculum.length;
  const approvedSessions = sessions.filter((s) => s.sesnSttsCd === "APPROVED").length;
  const recordedSessions = sessions.length;

  const progressPercent =
    program.progressRatio > 0
      ? Math.round(program.progressRatio)
      : curriculumTotal > 0
        ? Math.round((approvedSessions / curriculumTotal) * 100)
        : 0;

  const delayedItems = curriculum
    .filter(
      (item) =>
        item.sesnSttsCd === "NOT_SUBMITTED" &&
        item.planYmd != null &&
        item.planYmd.slice(0, 10) < today,
    )
    .sort((a, b) => (a.planYmd ?? "").localeCompare(b.planYmd ?? ""));

  const pendingReview = curriculum.filter(
    (item) =>
      item.sesnSttsCd === "SUBMITTED" || item.sesnSttsCd === "REVISION_REQUESTED",
  ).length;

  // 출석부에 줄이 있는 회차만 평균에 넣는다(0/0인 회차는 분모를 부풀린다)
  const counted = sessions.filter((s) => s.totalCount > 0);
  const present = counted.reduce((sum, s) => sum + s.presentCount, 0);
  const total = counted.reduce((sum, s) => sum + s.totalCount, 0);
  const averageAttendancePercent =
    total > 0 ? Math.round((present / total) * 100) : null;

  return {
    curriculumTotal,
    approvedSessions,
    recordedSessions,
    progressPercent,
    delayedItems,
    pendingReview,
    averageAttendancePercent,
  };
}

export async function loadMyProgramDetail(
  academicProgramId: number,
): Promise<MyProgramDetailLoad> {
  try {
    const programs = await fetchMyAcademicPrograms();
    const program = programs.find(
      (p) => p.academicProgramId === academicProgramId,
    );
    if (!program) return { outcome: "not-found" };

    const [curriculum, sessions, approvals] = await Promise.all([
      fetchCurriculumItems(academicProgramId),
      fetchAcademicSessions(academicProgramId),
      // 승인 이력이 실패해도 나머지는 유효하다 — 빈 배열로 떨어뜨린다(대시보드와 같은 처리)
      fetchAcademicProgramApprovals(academicProgramId).catch(() => []),
    ]);

    return {
      outcome: "ready",
      program,
      curriculum,
      sessions,
      approvals,
      stats: deriveStats(program, curriculum, sessions, todayInSeoul()),
    };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    return { outcome: "error", message: toLeaderDashboardErrorMessage(error) };
  }
}
