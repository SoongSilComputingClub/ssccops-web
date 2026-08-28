"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SESSION_REVIEW_ERROR,
  fetchAcademicProgramApprovals,
  fetchAcademicSession,
  transitionSession,
  type AcademicProgramApproval,
  type AcademicSessionDetail,
  type SessionTransition,
} from "@/entities/academic-session";
import { ApiError } from "@/shared/lib/api/client";
import { toSessionReviewErrorMessage } from "./session-review-error";

/*
 * 회차 상세 조회·전이 훅 (#130).
 *
 * 회차 이력(views/session-history)에서 회차 하나를 열었을 때 쓴다 — 회차·출석 승인 화면의
 * useSessionReview 는 좌측 목록과 우측 상세를 함께 쥐지만, 이력에서 온 상세 화면은 목록이
 * 없으므로 상세 하나만 다룬다.
 *
 * 상세와 승인 이력을 함께 받는다 — 두 조회의 수명이 같고(같은 회차), 화면이 둘을 나란히
 * 그린다. `latestOpinion`(회차 상세)은 "가장 최근 사유" 한 줄이고, approvals 는 그 전체
 * 이력이다 — 회차 상세 화면은 둘 다 보여 준다.
 *
 * ── SUBMITTED 회차만 전이한다 ──────────────────────────────────
 * 승인·수정요청은 SUBMITTED 에서만 가능하다(서버 #136). 전이가 성공하면 상세·이력을 함께
 * 다시 조회한다(부분 갱신 금지 · AGENTS.md) — 전이 응답에는 상태만 있고 화면은
 * latestOpinion·이력까지 그린다.
 */

export type SessionDetailPageStatus =
  | "loading"
  | "ready"
  | "not-found"
  | "error";

interface Loaded {
  key: string;
  detail: AcademicSessionDetail | null;
  approvals: AcademicProgramApproval[];
  outcome: Exclude<SessionDetailPageStatus, "loading">;
  errorMessage: string;
}

export interface SessionDetailView {
  status: SessionDetailPageStatus;
  errorMessage: string;
  detail: AcademicSessionDetail | null;
  /** SESSION 지점 승인 이력 — 최신순으로 서버가 준다 */
  approvals: AcademicProgramApproval[];
  reload: () => void;

  transitioning: boolean;
  /** 성공하면 빈 문자열, 실패하면 사용자에게 보여줄 한 줄 */
  runTransition: (
    transition: SessionTransition,
    reason?: string | null,
  ) => Promise<string>;
}

export function useSessionDetail(
  academicProgramId: number,
  sessionId: number,
): SessionDetailView {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const requestKey = `${academicProgramId}:${sessionId}:${reloadKey}`;

  useEffect(() => {
    let alive = true;

    (async () => {
      const detail = await fetchAcademicSession(academicProgramId, sessionId);
      // 승인 이력 조회가 실패해도 상세는 이미 있다 — 이력만 빈 배열로 둔다
      let approvals: AcademicProgramApproval[] = [];
      try {
        approvals = await fetchAcademicProgramApprovals(academicProgramId, {
          aprvPntCd: "SESSION",
          sessionId,
        });
      } catch {
        approvals = [];
      }
      if (!alive) return;
      setLoaded({
        key: requestKey,
        detail,
        approvals,
        outcome: "ready",
        errorMessage: "",
      });
    })().catch((error: unknown) => {
      if (!alive) return;
      const notFound =
        error instanceof ApiError &&
        (error.code === SESSION_REVIEW_ERROR.SESSION_NOT_FOUND ||
          error.code === SESSION_REVIEW_ERROR.ACADEMIC_PROGRAM_NOT_FOUND);
      setLoaded({
        key: requestKey,
        detail: null,
        approvals: [],
        outcome: notFound ? "not-found" : "error",
        errorMessage: notFound ? "" : toSessionReviewErrorMessage(error),
      });
    });

    return () => {
      alive = false;
    };
  }, [requestKey, academicProgramId, sessionId]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const runTransition = useCallback(
    async (
      transition: SessionTransition,
      reason?: string | null,
    ): Promise<string> => {
      if (transitioning) return "";
      setTransitioning(true);
      try {
        await transitionSession(academicProgramId, sessionId, {
          transition,
          reason: reason ?? null,
        });
        if (!aliveRef.current) return "";
        setReloadKey((k) => k + 1);
        return "";
      } catch (error: unknown) {
        return toSessionReviewErrorMessage(error);
      } finally {
        if (aliveRef.current) setTransitioning(false);
      }
    },
    [academicProgramId, sessionId, transitioning],
  );

  const current = loaded?.key === requestKey ? loaded : null;
  const status: SessionDetailPageStatus = current?.outcome ?? "loading";

  return {
    status,
    errorMessage: current?.errorMessage ?? "",
    detail: status === "ready" ? (current?.detail ?? null) : null,
    approvals: current?.approvals ?? [],
    reload,
    transitioning,
    runTransition,
  };
}
