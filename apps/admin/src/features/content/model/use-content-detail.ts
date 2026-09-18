"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CONTENT_ERROR,
  fetchContentPage,
  fetchContentPost,
  type ContentPage,
  type ContentPost,
} from "@/entities/content";
import { ApiError } from "@/shared/lib/api/client";
import { toContentErrorMessage } from "./content-error";

/*
 * 콘텐츠 단건 조회 훅 (#521). 구조의 근거는 features/event/model/use-event-detail.ts와 같다 —
 * "없음"을 오류가 아니라 별도 상태로 나눈다(재시도해도 없는 것은 없다 · 목록으로 돌아갈 길을 준다).
 */

export type ContentDetailStatus = "loading" | "ready" | "not-found" | "error";

interface Loaded<T> {
  key: string;
  item: T | null;
  outcome: Exclude<ContentDetailStatus, "loading">;
  errorMessage: string;
}

export interface ContentDetailQuery<T> {
  item: T | null;
  status: ContentDetailStatus;
  errorMessage: string;
  reload: () => void;
  /**
   * 응답으로 화면을 갈아 끼운다 — 저장·게시 전이의 응답이 상세 전체라 재조회 없이 곧바로 최신이다.
   * 갤러리 삭제처럼 응답이 비는 조작은 `reload`를 쓴다.
   */
  replace: (item: T) => void;
}

function useContentDetail<T>(
  id: number,
  fetchOne: (id: number) => Promise<T>,
  notFoundCode: string,
): ContentDetailQuery<T> {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${id}|${reloadKey}`;
  /* URL의 id는 사용자가 손으로 고칠 수 있다 — 숫자가 아니면 서버까지 갈 것 없이 끊는다 */
  const isFetchable = Number.isInteger(id) && id > 0;

  useEffect(() => {
    if (!isFetchable) return;
    let alive = true;

    fetchOne(id)
      .then((item) => {
        if (alive) setLoaded({ key: requestKey, item, outcome: "ready", errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        const notFound = error instanceof ApiError && error.code === notFoundCode;
        setLoaded({
          key: requestKey,
          item: null,
          outcome: notFound ? "not-found" : "error",
          errorMessage: notFound ? "" : toContentErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [id, isFetchable, requestKey, fetchOne, notFoundCode]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const replace = useCallback(
    (item: T) => setLoaded({ key: requestKey, item, outcome: "ready", errorMessage: "" }),
    [requestKey],
  );

  const current = loaded?.key === requestKey ? loaded : null;
  const status: ContentDetailStatus = !isFetchable ? "not-found" : (current?.outcome ?? "loading");

  return {
    item: status === "ready" ? (current?.item ?? null) : null,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    replace,
  };
}

export function useContentPage(pageId: number): ContentDetailQuery<ContentPage> {
  return useContentDetail(pageId, fetchContentPage, CONTENT_ERROR.PAGE_NOT_FOUND);
}

export function useContentPost(postId: number): ContentDetailQuery<ContentPost> {
  return useContentDetail(postId, fetchContentPost, CONTENT_ERROR.POST_NOT_FOUND);
}
