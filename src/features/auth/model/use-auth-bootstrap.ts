"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAuthSession, useSessionStore, type SessionStatus } from "@/entities/session";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/*
 * 세션 조회 자체(fetchAuthSession)는 entities/session으로 내려갔다 — 403을 받은 다른 feature도
 * 세션을 다시 받아야 하는데, features끼리 가져오면 레이어가 깨지기 때문이다(그쪽 주석 참고).
 * 이 훅은 조회 결과를 부트스트랩 상태로 옮기는 일만 한다.
 *
 * 훅이 스토어에 이미 세션이 있으면 재조회를 건너뛰므로, 한 번의 페이지 로드에서는 한 번만 부른다.
 */

export interface AuthBootstrap {
  status: SessionStatus;
  errorMessage: string | null;
  /** 실패 화면의 다시 시도 버튼 */
  retry: () => void;
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === API_ERROR.CONFIG_MISSING) {
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    }
    if (error.code === API_ERROR.NETWORK_ERROR) {
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    }
    return error.message;
  }
  return "세션을 불러오지 못했습니다";
}

/**
 * 로그인한 Supabase 사용자를 서버 세션(회원 정보)과 연결한다.
 *
 * 판정은 전적으로 서버 응답의 signedUp에 맡긴다. 예전에는 목 회원 배열에서 authUserId를
 * 클라이언트가 직접 매칭했는데, 실제 서버에서는 회원 명부를 통째로 받아 뒤지는 방식이
 * 성립하지 않는다.
 */
export function useAuthBootstrap(): AuthBootstrap {
  const status = useSessionStore((s) => s.status);
  const errorMessage = useSessionStore((s) => s.errorMessage);
  const setSession = useSessionStore((s) => s.setSession);
  const setStatus = useSessionStore((s) => s.setStatus);
  const fail = useSessionStore((s) => s.fail);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // 게이트 간 이동으로 다시 마운트된 경우 — 이미 받아 둔 세션을 그대로 쓴다
    if (attempt === 0 && useSessionStore.getState().authUser) return;

    let cancelled = false;
    setStatus("pending");

    fetchAuthSession()
      .then((session) => {
        if (!cancelled) setSession(session);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        /*
         * 401은 apiFetch가 로그아웃과 /login 이동까지 마친 상태다.
         * status를 idle로 되돌려 무한 로딩 상태에 빠지지 않도록 한다.
         */
        if (error instanceof ApiError && error.code === API_ERROR.UNAUTHORIZED) {
          setStatus("idle");
          return;
        }
        fail(messageOf(error));
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, setSession, setStatus, fail]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, errorMessage, retry };
}
