"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchDashboard, type DashboardData } from "@/entities/dashboard";
import { toDashboardErrorMessage } from "./dashboard-error";

/*
 * 운영 대시보드 조회 훅 (OPS-038 · ssccops-web#60).
 *
 * 세 영역을 한 번의 호출로 함께 받는다 — 커서 페이징이 없는 요약 응답이라
 * useApprovalInbox·useSubWorkList와 달리 loadMore가 없다. "결과에 요청 식별자를 실어
 * 로딩을 파생시키는" 구조는 그 두 훅과 같다 — reload 직후에도 이전 데이터가 잠깐 남아
 * 화면이 깜빡이지 않게 하면서, effect 안에서 setState("loading")을 직접 호출하지 않는다.
 */

export type DashboardStatus = "loading" | "ready" | "error";

interface LoadedDashboard {
  key: number;
  data: DashboardData;
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface Dashboard {
  data: DashboardData;
  status: DashboardStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

const EMPTY: DashboardData = { pendingApproval: [], upcomingDeadlines: [], myTasks: [] };

export function useDashboard(): Dashboard {
  const [loaded, setLoaded] = useState<LoadedDashboard | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;

    fetchDashboard()
      .then((data) => {
        if (!alive) return;
        setLoaded({ key: reloadKey, data, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded({ key: reloadKey, data: EMPTY, errorMessage: toDashboardErrorMessage(error) });
      });

    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // 이번 요청의 결과가 아직 없으면(최초 진입이든 재시도 직후든) 로딩이다
  const current = loaded?.key === reloadKey ? loaded : null;
  const status: DashboardStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    data: current?.data ?? EMPTY,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
