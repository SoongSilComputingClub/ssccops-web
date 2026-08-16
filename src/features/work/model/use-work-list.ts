"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWorks, type WorkListItem } from "@/entities/work";
import { toWorkErrorMessage } from "./work-error";

/*
 * 업무 목록 조회 훅 (OPS-020).
 *
 * 페칭 방식(SWR·React Query를 넣지 않는 이유)과 "결과에 요청 식별자를 실어 로딩을
 * 파생시키는" 구조의 근거는 features/form/model/use-form-list.ts 주석 참고. 같은 구조를
 * 쓰되 여기에는 커서 페이징이 하나 더 붙는다.
 *
 * ── 커서를 화면까지 올리는 이유 ──────────────────────────────
 * 서버는 한 번에 20건까지만 내려주고 나머지는 `nextCursor`로 이어 받는다. 첫 페이지만
 * 그리고 마는 것은 21번째 업무가 등록된 순간 목록에서 조용히 사라지는 것과 같다 —
 * 사람이 알아채기 어려운 종류의 누락이라 '더 보기'로 드러낸다.
 *
 * 이어 받은 페이지는 **덧붙인다**. 커서 페이징은 페이지 번호가 없어 되돌아갈 방법이 없고,
 * 카드 그리드는 스크롤로 훑는 화면이라 이전 페이지를 지우면 방금 본 업무가 없어진다.
 */

export type WorkListStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedWorkList {
  key: string;
  works: WorkListItem[];
  nextCursor: string | null;
  hasNext: boolean;
  /** 서버가 센 전체 건수 — 지금 받아 둔 works.length와 다를 수 있다 */
  totalCount: number;
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface WorkList {
  works: WorkListItem[];
  status: WorkListStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  totalCount: number;
  hasNext: boolean;
  /** 다음 페이지를 받아 오는 중 — '더 보기' 연타를 막는다 */
  loadingMore: boolean;
  /** 실패하면 사용자에게 보여줄 한 줄을 돌려준다 (성공·중복 호출이면 빈 문자열) */
  loadMore: () => Promise<string>;
  reload: () => void;
}

export function useWorkList(): WorkList {
  const [loaded, setLoaded] = useState<LoadedWorkList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  /* 이어 받기는 "지금 화면에 있는 마지막 커서"가 필요한데, 그 값을 의존성에 넣으면
     페이지를 받을 때마다 loadMore가 새로 만들어진다. 렌더와 무관한 읽기라 ref로 둔다. */
  const loadedRef = useRef<LoadedWorkList | null>(null);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  const requestKey = String(reloadKey);

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

    fetchWorks()
      .then((page) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          works: page.works,
          nextCursor: page.nextCursor,
          hasNext: page.hasNext,
          totalCount: page.totalCount,
          errorMessage: "",
        });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          works: [],
          nextCursor: null,
          hasNext: false,
          totalCount: 0,
          errorMessage: toWorkErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const loadMore = useCallback(async (): Promise<string> => {
    const current = loadedRef.current;
    if (inFlightRef.current || !current?.hasNext || !current.nextCursor) return "";

    inFlightRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchWorks({ cursor: current.nextCursor });
      if (!aliveRef.current) return "";

      /*
       * 이어 받는 사이에 재시도(reload)가 돌았을 수 있다. 그때는 key가 달라지므로
       * 옛 커서로 받은 페이지를 새 목록에 덧붙이지 않고 버린다.
       */
      setLoaded((prev) =>
        prev && prev.key === current.key
          ? {
              ...prev,
              works: [...prev.works, ...page.works],
              nextCursor: page.nextCursor,
              hasNext: page.hasNext,
              totalCount: page.totalCount,
            }
          : prev,
      );
      return "";
    } catch (error: unknown) {
      return toWorkErrorMessage(error);
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setLoadingMore(false);
    }
  }, []);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // 이번 요청의 결과가 아직 없으면(최초 진입이든 재시도 직후든) 로딩이다
  const current = loaded?.key === requestKey ? loaded : null;
  const status: WorkListStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    works: current?.works ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    totalCount: current?.totalCount ?? 0,
    hasNext: current?.hasNext ?? false,
    loadingMore,
    loadMore,
    reload,
  };
}
