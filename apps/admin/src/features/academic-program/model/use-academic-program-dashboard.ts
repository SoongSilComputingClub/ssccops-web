"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAcademicPrograms,
  type AcademicProgramSummary,
} from "@/entities/academic-program";
import {
  fetchAcademicProgramSessions,
  fetchSessionReviews,
  type SessionCrossListItem,
} from "@/entities/academic-session";
import { isWithinThisWeek, todayInSeoul } from "@/shared/lib/date";
import { toAcademicProgramErrorMessage } from "./academic-program-error";

/*
 * 학술국장 대시보드 조회 훅 (#126 · 서버 #131·#136).
 *
 * ── 전용 엔드포인트가 없다 ────────────────────────────────────
 * 운영 대시보드(`GET /v1/dashboard`)와 달리 학술에는 요약 응답이 없다. 이슈가 지정한 세
 * 조회를 한 훅에서 병렬로 모아 화면이 그릴 값으로 가공한다 — 같은 집계가 여러 화면에 흩어지지
 * 않게 "이번 주"·"지연" 판정을 여기 한 곳에 가둔다(이슈 「결정해서 남길 것」).
 *
 *  1. GET /v1/academic-programs               — 전체 활동. 진행 중(ONGOING) 수·지연 수·최근 활동.
 *  2. GET /v1/academic-programs/sessions      — 활동 횡단 회차(전 상태). "이번 주 회차".
 *  3. GET /v1/academic-programs/reviews/sessions — SUBMITTED 회차. "승인 대기" 수.
 *
 * 셋 다 `ACADEMIC_PROGRAM_MANAGE`를 요구한다 — 권한이 없으면 첫 조회부터 403이라, nav가 이
 * 화면을 감춘다(주소로 들어오면 오류 블록).
 *
 * ── "이번 주"·"지연"은 웹이 판정한다 ─────────────────────────────
 * 서버가 그 필터를 주지 않는다. 기준일은 `todayInSeoul()`이다(프로토타입의 고정 기준일
 * 2026-08-21을 쓰면 이미 지난 회차가 미래로 보인다).
 *  - 이번 주 회차: 회차의 `actualYmd`(실제 진행일)가 이번 주(월~일) 안에 드는 것.
 *    **계획일(planYmd)이 활동 횡단 회차 응답에 없다** — SessionCrossListItem은 진행일만 준다.
 *    그래서 "예정"이 아니라 "이번 주에 진행된/진행일이 잡힌 회차"를 보여 준다. 서버가 계획일을
 *    이 응답에 실어 주면 미래 회차까지 포함하도록 넓힌다(그 전까지는 있는 필드로 최대한).
 *  - 지연 활동: 서버가 활동별 지연 플래그를 주지 않으므로 진행률로 근사한다 — ONGOING인데
 *    진행률(progressRatio)이 40% 미만인 활동. 정확한 "계획 대비 회차 미달"은 활동별 커리큘럼
 *    일정이 필요해 대시보드 범위 밖이다(근사임을 화면 문구가 밝힌다).
 *
 * 페칭 방식(SWR·React Query를 넣지 않는 것)과 "결과에 요청 식별자를 실어 로딩을 파생시키는"
 * 구조는 features/dashboard/model/use-dashboard.ts와 같다.
 */

export type AcademicProgramDashboardStatus = "loading" | "ready" | "error";

/** 지연으로 볼 진행률 하한(%) — 이보다 낮은 ONGOING 활동을 "계획 대비 회차 미달"로 근사한다 */
const DELAYED_PROGRESS_THRESHOLD = 40;

/** 최근 활동 카드에 세울 활동 수 */
const RECENT_LIMIT = 5;

export interface AcademicProgramDashboardData {
  /** 진행 중(ONGOING) 활동 수 */
  ongoingCount: number;
  /** 그중 스터디·프로젝트 분해 — typeCd별 (표시명이 없어 코드 문자열) */
  ongoingByType: { typeCd: string; count: number }[];
  /** 지연 근사 활동 수 (ONGOING × 진행률 < 40%) */
  delayedCount: number;
  /** 승인 대기 회차 수 (SUBMITTED) */
  pendingSessionCount: number;
  /** 이번 주 회차 (진행일이 이번 주 안) — 진행일 오름차순 */
  thisWeekSessions: SessionCrossListItem[];
  /** 진행 중 활동 카드 (서버 기본 정렬 = 등록 최신순, 최대 8) */
  ongoingPrograms: AcademicProgramSummary[];
  /**
   * 최근 활동 (서버 기본 정렬 = 등록 최신순, 최대 5).
   *
   * 활동 목록 응답에 `updatedAt`이 없어 "최근 처리된 회차/기록"을 활동 단위로 세울 수 없다.
   * 프로토타입의 활동 피드(기록 제출·승인·수정요청)는 활동 횡단 감사 로그가 필요한데 그런
   * 엔드포인트가 없으므로, 있는 필드로 "최근 등록된 활동"을 보여 준다. 감사 피드가 필요하면
   * 서버에 요청한다(#126 결정 — 있는 필드로 최대한).
   */
  recentPrograms: AcademicProgramSummary[];
}

interface Loaded {
  key: number;
  data: AcademicProgramDashboardData;
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface AcademicProgramDashboard {
  data: AcademicProgramDashboardData;
  status: AcademicProgramDashboardStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

const EMPTY: AcademicProgramDashboardData = {
  ongoingCount: 0,
  ongoingByType: [],
  delayedCount: 0,
  pendingSessionCount: 0,
  thisWeekSessions: [],
  ongoingPrograms: [],
  recentPrograms: [],
};

/** 커서 페이징을 끝까지 순회해 전 활동을 모은다 (한 학기 활동 수는 수십 건 이내) */
async function fetchAllPrograms(): Promise<AcademicProgramSummary[]> {
  const all: AcademicProgramSummary[] = [];
  let cursor: string | null = null;

  for (let guard = 0; guard < 20; guard += 1) {
    const page = await fetchAcademicPrograms({ size: 100, cursor });
    all.push(...page.academicPrograms);
    if (!page.hasNext || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return all;
}

/** 이번 주 회차만 순회해 모은다 — 회차 이력은 진행일 오름차순이 기본이라 앞쪽만 훑으면 된다 */
async function fetchThisWeekSessions(today: string): Promise<SessionCrossListItem[]> {
  const matched: SessionCrossListItem[] = [];
  let cursor: string | null = null;

  for (let guard = 0; guard < 20; guard += 1) {
    const page = await fetchAcademicProgramSessions({ size: 100, cursor });
    for (const s of page.sessions) {
      if (isWithinThisWeek(s.actualYmd, today)) matched.push(s);
    }
    if (!page.hasNext || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return matched;
}

function summarize(
  programs: AcademicProgramSummary[],
  thisWeekSessions: SessionCrossListItem[],
  pendingSessionCount: number,
): AcademicProgramDashboardData {
  const ongoing = programs.filter((p) => p.sttsCd === "ONGOING");

  const byType = new Map<string, number>();
  for (const p of ongoing) {
    byType.set(p.typeCd, (byType.get(p.typeCd) ?? 0) + 1);
  }

  const delayedCount = ongoing.filter(
    (p) => p.progressRatio < DELAYED_PROGRESS_THRESHOLD,
  ).length;

  // fetchAcademicPrograms의 기본 정렬은 서버가 등록 최신순(-createdAt)으로 잡는다 —
  // 받은 순서가 곧 최근순이다(웹에서 다시 세지 않는다).
  const thisWeekSorted = [...thisWeekSessions].sort((a, b) =>
    (a.actualYmd ?? "").localeCompare(b.actualYmd ?? ""),
  );

  return {
    ongoingCount: ongoing.length,
    ongoingByType: Array.from(byType, ([typeCd, count]) => ({ typeCd, count })).sort(
      (a, b) => b.count - a.count,
    ),
    delayedCount,
    pendingSessionCount,
    thisWeekSessions: thisWeekSorted,
    ongoingPrograms: ongoing.slice(0, 8),
    recentPrograms: programs.slice(0, RECENT_LIMIT),
  };
}

export function useAcademicProgramDashboard(): AcademicProgramDashboard {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const today = todayInSeoul();

    (async () => {
      const [programs, thisWeekSessions, reviews] = await Promise.all([
        fetchAllPrograms(),
        fetchThisWeekSessions(today),
        fetchSessionReviews({ size: 1 }),
      ]);
      if (!alive) return;
      setLoaded({
        key: reloadKey,
        data: summarize(programs, thisWeekSessions, reviews.totalCount),
        errorMessage: "",
      });
    })().catch((error: unknown) => {
      if (!alive) return;
      setLoaded({
        key: reloadKey,
        data: EMPTY,
        errorMessage: toAcademicProgramErrorMessage(error),
      });
    });

    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === reloadKey ? loaded : null;
  const status: AcademicProgramDashboardStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    data: current?.data ?? EMPTY,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
