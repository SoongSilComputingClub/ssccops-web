"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAcademicProgramSessions,
  type SessionCrossListItem,
  type SessionHistoryFilter,
} from "@/entities/academic-session";
import { toSessionReviewErrorMessage } from "./session-review-error";

/*
 * 회차 이력 조회 훅 (#130 · GET /v1/academic-programs/sessions).
 *
 * 학술국장이 전체 활동의 회차 진행을 한 화면에서 훑는다 — 활동 하나에 종속된 조회가 아니라
 * 활동 횡단 조회다. 페칭 구조(결과에 요청 식별자를 실어 로딩을 파생시키는 방식)와 커서
 * 페이징은 use-academic-program-list 와 같다 — 그 훅을 거의 그대로 옮겼고, 다른 점은
 * 필터(상태·검색어)가 붙는 것 하나다.
 *
 * ── 필터가 바뀌면 처음부터 다시 받는다 ───────────────────────
 * 커서는 특정 필터 결과 위의 위치라, 상태를 바꾸고 옛 커서로 이어 받으면 서버가 400
 * (VALIDATION_FAILED)으로 끊는다. 필터를 requestKey 에 넣어 바뀔 때마다 첫 페이지부터
 * 다시 조회한다.
 *
 * ── 이어 받은 페이지는 덧붙인다 ───────────────────────────────
 * 페이지 번호가 없어 되돌아갈 방법이 없고, 표는 스크롤로 훑는 화면이라 이전 페이지를
 * 지우면 방금 본 회차가 사라진다.
 */

export type SessionHistoryStatus = "loading" | "ready" | "error";

interface LoadedList {
  key: string;
  sessions: SessionCrossListItem[];
  nextCursor: string | null;
  hasNext: boolean;
  /** 서버가 센 전체 건수 — 지금 받아 둔 sessions.length 와 다를 수 있다 */
  totalCount: number;
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface SessionHistory {
  sessions: SessionCrossListItem[];
  status: SessionHistoryStatus;
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

/** 조회에 영향을 주는 축만 뽑아 안정된 문자열 key 로 만든다 */
function filterKey(filter: SessionHistoryFilter): string {
  return [
    filter.sesnSttsCd ?? "",
    filter.keyword ?? "",
    filter.academicProgramId ?? "",
    filter.sort ?? "",
  ].join("|");
}

export function useSessionHistory(
  filter: SessionHistoryFilter = {},
): SessionHistory {
  const [loaded, setLoaded] = useState<LoadedList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadedRef = useRef<LoadedList | null>(null);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  const fkey = filterKey(filter);
  const requestKey = `${fkey}|${reloadKey}`;

  const filterRef = useRef(filter);
  useEffect(() => {
    filterRef.current = filter;
  });

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

    fetchAcademicProgramSessions(filterRef.current)
      .then((page) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          sessions: page.sessions,
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
          sessions: [],
          nextCursor: null,
          hasNext: false,
          totalCount: 0,
          errorMessage: toSessionReviewErrorMessage(error),
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
      const page = await fetchAcademicProgramSessions({
        ...filterRef.current,
        cursor: current.nextCursor,
      });
      if (!aliveRef.current) return "";

      setLoaded((prev) =>
        prev && prev.key === current.key
          ? {
              ...prev,
              sessions: [...prev.sessions, ...page.sessions],
              nextCursor: page.nextCursor,
              hasNext: page.hasNext,
              totalCount: page.totalCount,
            }
          : prev,
      );
      return "";
    } catch (error: unknown) {
      return toSessionReviewErrorMessage(error);
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setLoadingMore(false);
    }
  }, []);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: SessionHistoryStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    sessions: current?.sessions ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    totalCount: current?.totalCount ?? 0,
    hasNext: current?.hasNext ?? false,
    loadingMore,
    loadMore,
    reload,
  };
}
