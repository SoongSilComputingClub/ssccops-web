"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchApprovals,
  type ApprovalInboxItem,
  type ApprovalInboxTab,
} from "@/entities/approval";
import { toApprovalInboxErrorMessage } from "./approval-error";

/*
 * 승인함 조회 훅 (OPS-017 · ssccops-web#45).
 *
 * 페칭 방식과 "결과에 요청 식별자를 실어 로딩을 파생시키는" 구조의 근거는
 * features/sub-work/model/use-sub-work-list.ts 주석과 같다. 탭이 바뀌면 처음부터 다시
 * 받는다 — 커서는 직전 탭으로 만들어진 값이라 탭이 바뀐 채로 이어 받으면(loadMore) 서로
 * 다른 조건의 페이지가 한 목록에 섞인다.
 */

export type ApprovalInboxStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedApprovalInbox {
  key: string;
  approvals: ApprovalInboxItem[];
  nextCursor: string | null;
  hasNext: boolean;
  totalCount: number;
  overallCount: number;
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface ApprovalInbox {
  approvals: ApprovalInboxItem[];
  status: ApprovalInboxStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  /** 이 탭 기준 건수 */
  totalCount: number;
  hasNext: boolean;
  /** 다음 페이지를 받아 오는 중 — '더 보기' 연타를 막는다 */
  loadingMore: boolean;
  /** 실패하면 사용자에게 보여줄 한 줄을 돌려준다 (성공·중복 호출이면 빈 문자열) */
  loadMore: () => Promise<string>;
  reload: () => void;
}

export function useApprovalInbox(tab: ApprovalInboxTab): ApprovalInbox {
  const [loaded, setLoaded] = useState<LoadedApprovalInbox | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  /* 이어 받기는 "지금 화면에 있는 마지막 커서"가 필요한데, 그 값을 의존성에 넣으면
     페이지를 받을 때마다 loadMore가 새로 만들어진다. 렌더와 무관한 읽기라 ref로 둔다. */
  const loadedRef = useRef<LoadedApprovalInbox | null>(null);
  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);

  const requestKey = `${tab}:${reloadKey}`;

  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    fetchApprovals({ tab })
      .then((page) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          approvals: page.approvals,
          nextCursor: page.nextCursor,
          hasNext: page.hasNext,
          totalCount: page.totalCount,
          overallCount: page.overallCount,
          errorMessage: "",
        });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          approvals: [],
          nextCursor: null,
          hasNext: false,
          totalCount: 0,
          overallCount: 0,
          errorMessage: toApprovalInboxErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [requestKey, tab]);

  const loadMore = useCallback(async (): Promise<string> => {
    const current = loadedRef.current;
    if (inFlightRef.current || !current?.hasNext || !current.nextCursor) return "";

    inFlightRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchApprovals({ tab, cursor: current.nextCursor });
      if (!aliveRef.current) return "";

      /*
       * 이어 받는 사이에 재시도(reload)나 탭 전환이 돌았을 수 있다. 그때는 key가 달라지므로
       * 옛 커서로 받은 페이지를 새 목록에 덧붙이지 않고 버린다.
       */
      setLoaded((prev) =>
        prev && prev.key === current.key
          ? {
              ...prev,
              approvals: [...prev.approvals, ...page.approvals],
              nextCursor: page.nextCursor,
              hasNext: page.hasNext,
              totalCount: page.totalCount,
              overallCount: page.overallCount,
            }
          : prev,
      );
      return "";
    } catch (error: unknown) {
      return toApprovalInboxErrorMessage(error);
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setLoadingMore(false);
    }
  }, [tab]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // 이번 요청의 결과가 아직 없으면(최초 진입이든 탭 전환·재시도 직후든) 로딩이다
  const current = loaded?.key === requestKey ? loaded : null;
  const status: ApprovalInboxStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    approvals: current?.approvals ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    totalCount: current?.totalCount ?? 0,
    hasNext: current?.hasNext ?? false,
    loadingMore,
    loadMore,
    reload,
  };
}
