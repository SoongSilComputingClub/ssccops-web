"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchOperationsHub, type OperationsHubData } from "@/entities/oper";
import { toOperationsHubErrorMessage } from "./operations-hub-error";

/*
 * 운영 통합 조회 훅 (OPS-001 · ssccops-web#63).
 *
 * 세 배열을 한 번의 호출로 함께 받는다 — 커서 페이징이 없는 전량 응답이라 loadMore가 없다.
 * "결과에 요청 식별자를 실어 로딩을 파생시키는" 구조는 useDashboard와 같다 — reload 직후에도
 * 이전 데이터가 잠깐 남아 화면이 깜빡이지 않게 하면서, effect 안에서 setState("loading")을
 * 직접 호출하지 않는다.
 */

export type OperationsHubStatus = "loading" | "ready" | "error";

interface LoadedOperationsHub {
  key: number;
  data: OperationsHubData;
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface OperationsHub {
  data: OperationsHubData;
  status: OperationsHubStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

const EMPTY: OperationsHubData = { works: [], subWorks: [], meetings: [] };

export function useOperationsHub(): OperationsHub {
  const [loaded, setLoaded] = useState<LoadedOperationsHub | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;

    fetchOperationsHub()
      .then((data) => {
        if (!alive) return;
        setLoaded({ key: reloadKey, data, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded({
          key: reloadKey,
          data: EMPTY,
          errorMessage: toOperationsHubErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // 이번 요청의 결과가 아직 없으면(최초 진입이든 재시도 직후든) 로딩이다
  const current = loaded?.key === reloadKey ? loaded : null;
  const status: OperationsHubStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    data: current?.data ?? EMPTY,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
