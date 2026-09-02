"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SESSION_REVIEW_ERROR,
  fetchAcademicSession,
  fetchSessionReviews,
  transitionSession,
  type AcademicSessionDetail,
  type SessionCrossListItem,
  type SessionTransition,
} from "@/entities/academic-session";
import { ApiError } from "@/shared/lib/api/client";
import { toSessionReviewErrorMessage } from "./session-review-error";

/*
 * 회차·출석 승인 훅 (#129 · 서버 #136).
 *
 * 좌측 승인 대기 목록(활동 횡단, SUBMITTED 만)과 우측 선택 항목 상세를 한 훅에서 쥔다 —
 * 두 조회의 수명이 얽혀 있기 때문이다. 전이(승인·수정요청) 후에는 **목록을 다시 조회한다**
 * (AGENTS.md "부분 갱신과 재조회를 가른다") — 전이 응답으로 처리한 건만 지우면 서버가 세는
 * 다음 페이지·전체 건수와 어긋나고, 처리한 건이 목록에 남는다.
 *
 * ── 선택 상세는 목록과 별개로 로딩한다 ──────────────────────
 * 목록을 다시 부르는 동안에도 방금 처리한 회차의 상세는 그대로 보여 준다(승인 직후 "승인됨"
 * 배지가 뜬 카드를 사용자가 확인할 수 있게). 목록이 새로 오면 그 회차는 목록에서 빠지지만
 * 우측 상세는 사용자가 다른 항목을 고르거나 닫을 때까지 남는다.
 *
 * 커서 페이징은 use-academic-program-list 와 같은 모양이라 그 구조를 그대로 옮겼다.
 */

export type SessionReviewListStatus = "loading" | "ready" | "error";
export type SessionDetailStatus =
  | "idle"
  | "loading"
  | "ready"
  | "not-found"
  | "error";

interface LoadedList {
  key: string;
  sessions: SessionCrossListItem[];
  nextCursor: string | null;
  hasNext: boolean;
  totalCount: number;
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

interface LoadedDetail {
  /** `${academicProgramId}:${sessionId}:${reloadKey}` */
  key: string;
  detail: AcademicSessionDetail | null;
  outcome: Exclude<SessionDetailStatus, "idle" | "loading">;
  errorMessage: string;
}

export interface SessionReviewState {
  /* 좌측 목록 */
  sessions: SessionCrossListItem[];
  listStatus: SessionReviewListStatus;
  listErrorMessage: string;
  totalCount: number;
  hasNext: boolean;
  loadingMore: boolean;
  loadMore: () => Promise<string>;
  reloadList: () => void;

  /* 우측 선택 항목 */
  selected: { academicProgramId: number; sessionId: number } | null;
  detail: AcademicSessionDetail | null;
  detailStatus: SessionDetailStatus;
  detailErrorMessage: string;
  select: (academicProgramId: number, sessionId: number) => void;
  clearSelection: () => void;
  reloadDetail: () => void;

  /* 전이 */
  transitioning: boolean;
  /** 성공하면 빈 문자열, 실패하면 사용자에게 보여줄 한 줄을 돌려준다 */
  runTransition: (
    transition: SessionTransition,
    reason?: string | null,
  ) => Promise<string>;
}

const PAGE_SIZE = 20;

export function useSessionReview(): SessionReviewState {
  /* ── 목록 ── */
  const [list, setList] = useState<LoadedList | null>(null);
  const [listReloadKey, setListReloadKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const listRef = useRef<LoadedList | null>(null);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  const listKey = String(listReloadKey);

  useEffect(() => {
    listRef.current = list;
  }, [list]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    fetchSessionReviews({ size: PAGE_SIZE })
      .then((page) => {
        if (!alive) return;
        setList({
          key: listKey,
          sessions: page.sessions,
          nextCursor: page.nextCursor,
          hasNext: page.hasNext,
          totalCount: page.totalCount,
          errorMessage: "",
        });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setList({
          key: listKey,
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
  }, [listKey]);

  const loadMore = useCallback(async (): Promise<string> => {
    const current = listRef.current;
    if (inFlightRef.current || !current?.hasNext || !current.nextCursor) return "";

    inFlightRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchSessionReviews({
        size: PAGE_SIZE,
        cursor: current.nextCursor,
      });
      if (!aliveRef.current) return "";

      setList((prev) =>
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

  const reloadList = useCallback(() => setListReloadKey((k) => k + 1), []);

  const currentList = list?.key === listKey ? list : null;
  const listStatus: SessionReviewListStatus =
    currentList === null
      ? "loading"
      : currentList.errorMessage
        ? "error"
        : "ready";

  /* ── 선택 항목 상세 ── */
  const [selected, setSelected] = useState<{
    academicProgramId: number;
    sessionId: number;
  } | null>(null);
  const [detail, setDetail] = useState<LoadedDetail | null>(null);
  const [detailReloadKey, setDetailReloadKey] = useState(0);

  const detailKey = selected
    ? `${selected.academicProgramId}:${selected.sessionId}:${detailReloadKey}`
    : "";

  useEffect(() => {
    if (!selected) return;

    let alive = true;
    const { academicProgramId, sessionId } = selected;

    fetchAcademicSession(academicProgramId, sessionId)
      .then((next) => {
        if (!alive) return;
        setDetail({
          key: detailKey,
          detail: next,
          outcome: "ready",
          errorMessage: "",
        });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        const notFound =
          error instanceof ApiError &&
          (error.code === SESSION_REVIEW_ERROR.SESSION_NOT_FOUND ||
            error.code === SESSION_REVIEW_ERROR.ACADEMIC_PROGRAM_NOT_FOUND);
        setDetail({
          key: detailKey,
          detail: null,
          outcome: notFound ? "not-found" : "error",
          errorMessage: notFound ? "" : toSessionReviewErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [selected, detailKey]);

  const select = useCallback(
    (academicProgramId: number, sessionId: number) => {
      setDetail(null);
      setDetailReloadKey(0);
      setSelected({ academicProgramId, sessionId });
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelected(null);
    setDetail(null);
  }, []);

  const reloadDetail = useCallback(() => setDetailReloadKey((k) => k + 1), []);

  const currentDetail = detail?.key === detailKey ? detail : null;
  const detailStatus: SessionDetailStatus = !selected
    ? "idle"
    : (currentDetail?.outcome ?? "loading");

  /* ── 전이 ── */
  const [transitioning, setTransitioning] = useState(false);

  const runTransition = useCallback(
    async (
      transition: SessionTransition,
      reason?: string | null,
    ): Promise<string> => {
      if (!selected || transitioning) return "";

      setTransitioning(true);
      try {
        await transitionSession(selected.academicProgramId, selected.sessionId, {
          transition,
          reason: reason ?? null,
        });
        if (!aliveRef.current) return "";
        // 전이 응답으로 부분 갱신하지 않는다 — 목록·선택 상세를 함께 다시 부른다
        setListReloadKey((k) => k + 1);
        setDetailReloadKey((k) => k + 1);
        return "";
      } catch (error: unknown) {
        return toSessionReviewErrorMessage(error);
      } finally {
        if (aliveRef.current) setTransitioning(false);
      }
    },
    [selected, transitioning],
  );

  return {
    sessions: currentList?.sessions ?? [],
    listStatus,
    listErrorMessage: currentList?.errorMessage ?? "",
    totalCount: currentList?.totalCount ?? 0,
    hasNext: currentList?.hasNext ?? false,
    loadingMore,
    loadMore,
    reloadList,

    selected,
    detail: detailStatus === "ready" ? (currentDetail?.detail ?? null) : null,
    detailStatus,
    detailErrorMessage: currentDetail?.errorMessage ?? "",
    select,
    clearSelection,
    reloadDetail,

    transitioning,
    runTransition,
  };
}
