"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchContentPages,
  fetchContentPosts,
  type ContentListPage,
  type ContentPageSummary,
  type ContentPostSummary,
} from "@/entities/content";
import type { PubSttsCd } from "@/shared/config/codes";
import { toContentErrorMessage } from "./content-error";

/*
 * 콘텐츠 목록 훅 (#521) — 페이지·포스트가 같은 커서 봉투를 쓰므로 한 벌이다.
 *
 * 구조(요청 식별자로 로딩을 파생 · 이어 받기는 덧붙이기 · 재시도 중 옛 커서 페이지는 버림)의
 * 근거는 features/work/model/use-work-list.ts 주석. **필터(탭·상태)는 requestKey에 들어간다** —
 * 커서는 직전 조건으로 만들어진 값이라, 조건이 바뀐 채 loadMore로 이어 받으면 서로 다른 조건의
 * 페이지가 한 목록에 섞인다.
 */

export type ContentListStatus = "loading" | "ready" | "error";

interface Loaded<T> {
  key: string;
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
  totalCount: number;
  errorMessage: string;
}

export interface ContentList<T> {
  items: T[];
  status: ContentListStatus;
  errorMessage: string;
  totalCount: number;
  hasNext: boolean;
  loadingMore: boolean;
  /** 실패하면 사용자에게 보여줄 한 줄을 돌려준다 (성공·중복 호출이면 빈 문자열) */
  loadMore: () => Promise<string>;
  reload: () => void;
}

type PageFetcher<T> = (cursor: string | null) => Promise<ContentListPage<T>>;

/**
 * `key`는 요청 조건을 문자열로 편 것이고 `fetchPage`는 같은 조건에서 같은 정체성을 갖는 함수다
 * (useCallback) — 둘이 함께 바뀐다. 식별자를 문자열로 따로 받는 것은 함수 정체성으로는 «이번
 * 요청의 결과인가»를 렌더 중에 비교할 수 없기 때문이다(ref를 렌더에서 읽지 않는다).
 */
function useCursorList<T>(key: string, fetchPage: PageFetcher<T>): ContentList<T> {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadedRef = useRef<Loaded<T> | null>(null);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  const requestKey = `${key}|${reloadKey}`;

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

    fetchPage(null)
      .then((page) => {
        if (!alive) return;
        setLoaded({ key: requestKey, ...page, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          items: [],
          nextCursor: null,
          hasNext: false,
          totalCount: 0,
          errorMessage: toContentErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [fetchPage, requestKey]);

  const loadMore = useCallback(async (): Promise<string> => {
    const current = loadedRef.current;
    if (inFlightRef.current || !current?.hasNext || !current.nextCursor) return "";

    inFlightRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchPage(current.nextCursor);
      if (!aliveRef.current) return "";
      setLoaded((prev) =>
        prev && prev.key === current.key
          ? {
              ...prev,
              items: [...prev.items, ...page.items],
              nextCursor: page.nextCursor,
              hasNext: page.hasNext,
              totalCount: page.totalCount,
            }
          : prev,
      );
      return "";
    } catch (error: unknown) {
      return toContentErrorMessage(error);
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setLoadingMore(false);
    }
  }, [fetchPage]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // 이번 요청의 결과가 아직 없으면(최초 진입이든 조건 변경·재시도 직후든) 로딩이다
  const current = loaded?.key === requestKey ? loaded : null;
  const status: ContentListStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    items: current?.items ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    totalCount: current?.totalCount ?? 0,
    hasNext: current?.hasNext ?? false,
    loadingMore,
    loadMore,
    reload,
  };
}

/** GET /v1/content/pages — 게시 상태 필터 하나 */
export function useContentPageList(pubSttsCd: PubSttsCd | null): ContentList<ContentPageSummary> {
  const fetchPage = useCallback(
    (cursor: string | null) => fetchContentPages({ pubSttsCd, cursor }),
    [pubSttsCd],
  );
  return useCursorList(`pages:${pubSttsCd ?? ""}`, fetchPage);
}

/** GET /v1/content/posts — 게시 상태 필터 하나(분류 필터는 이 화면에 두지 않았다) */
export function useContentPostList(pubSttsCd: PubSttsCd | null): ContentList<ContentPostSummary> {
  const fetchPage = useCallback(
    (cursor: string | null) => fetchContentPosts({ pubSttsCd, cursor }),
    [pubSttsCd],
  );
  return useCursorList(`posts:${pubSttsCd ?? ""}`, fetchPage);
}
