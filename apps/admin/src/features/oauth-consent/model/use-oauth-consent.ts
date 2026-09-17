"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { currentPath, withNextParam } from "@ssccops/auth";
import {
  type OAuthAuthorization,
  OAuthAuthorizationError,
  approveOAuthAuthorization,
  denyOAuthAuthorization,
  fetchOAuthAuthorization,
} from "@/entities/oauth-authorization";
import { fetchAuthSession } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";

/*
 * OAuth 동의 화면의 상태 (ssccops#315 · ADR-0026).
 *
 * ── 화면이 가르는 상태 ──────────────────────────────────────
 * - `missing-id`  주소에 `authorization_id`가 없다 — Supabase가 보낸 것이 아니라 직접 연 것이다
 * - `loading`     인가 요청을 읽는 중
 * - `ready`       동의를 물을 수 있다. 승인·거절이 진행 중이면 `pending`
 * - `redirecting` 승인·거절이 끝났거나 이미 동의한 요청이라 클라이언트로 돌아가는 중
 * - `invalid`     요청이 없거나 만료됐거나 이미 처리됐다 — 연결을 다시 시작해야 한다
 * - `error`       네트워크·서버 오류 — 다시 시도할 수 있다
 *
 * `invalid`와 `error`를 가르는 것은 다음 행동이 다르기 때문이다. 만료된 요청은 아무리 다시
 * 시도해도 살아나지 않는다 — 그 자리에 «다시 시도» 버튼을 두면 사람이 영영 누른다.
 *
 * ── 세션이 없으면 로그인으로 ────────────────────────────────
 * 미들웨어가 미인증 요청을 `/login?next=`로 걸러 주므로 여기 오는 사람은 세션이 있다. 그래도
 * SDK가 `AuthSessionMissingError`를 줄 수 있다(열어 둔 사이 다른 탭에서 로그아웃). 그때는
 * 같은 주소(`authorization_id` 포함)로 돌아오도록 `next=`를 실어 로그인으로 보낸다 —
 * `apiFetch`의 401 처리와 같은 규약이다.
 *
 * ── 회원 여부는 안내만 한다 ─────────────────────────────────
 * 승인 자체는 Supabase 몫이라 우리 서버의 회원 판정과 무관하게 성공한다. 미가입 사용자가
 * 승인하면 토큰은 발급되지만 MCP 도구 호출은 서버에서 SIGNUP_REQUIRED로 막힌다(ADR-0026).
 * 그 사실을 여기서 한 줄로 알리되 **승인을 막지 않는다** — 판정은 서버 한 곳에만 둔다.
 * 조회는 기존 `GET /v1/auth/session`(`signedUp`)을 그대로 쓰고, 실패하면 안내를 생략한다
 * (서버가 꺼져 있다고 동의 화면까지 막을 이유가 없다).
 */

export type ConsentDecision = "approve" | "deny";

export type ConsentState =
  | { status: "missing-id" }
  | { status: "loading" }
  | {
      status: "ready";
      authorization: OAuthAuthorization;
      pending: ConsentDecision | null;
      /** 승인·거절 요청이 실패했을 때의 문구 — 화면은 그대로 두고 다시 누를 수 있다 */
      actionError: string | null;
    }
  | { status: "redirecting" }
  | { status: "invalid" }
  | { status: "error"; message: string };

export interface OAuthConsent {
  state: ConsentState;
  /**
   * 세션은 있으나 아직 회원이 아닌가. 확인 전이거나 확인에 실패했으면 `false` —
   * 안내를 잘못 보이는 것보다 생략하는 쪽이 낫다.
   */
  signupRequired: boolean;
  approve: () => Promise<void>;
  deny: () => Promise<void>;
  retry: () => void;
}

/** 승인·거절 실패 문구 — `invalid`는 화면 전체가 바뀌므로 여기서는 나머지만 */
const ACTION_ERROR_MESSAGE: Record<ConsentDecision, string> = {
  approve: "접근을 허용하지 못했습니다 — 잠시 후 다시 시도해주세요",
  deny: "요청을 거절하지 못했습니다 — 잠시 후 다시 시도해주세요",
};

export function useOAuthConsent(authorizationId: string | null): OAuthConsent {
  const router = useRouter();
  const [state, setState] = useState<ConsentState>(
    authorizationId ? { status: "loading" } : { status: "missing-id" },
  );
  const [signupRequired, setSignupRequired] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const redirectToLogin = useCallback(() => {
    router.replace(withNextParam(ROUTES.login, currentPath(), ROUTES.dashboard));
  }, [router]);

  useEffect(() => {
    if (!authorizationId) return;

    let cancelled = false;

    fetchOAuthAuthorization(authorizationId)
      .then((lookup) => {
        if (cancelled) return;
        if (lookup.kind === "redirect") {
          setState({ status: "redirecting" });
          window.location.assign(lookup.redirectUrl);
          return;
        }
        setState({
          status: "ready",
          authorization: lookup.authorization,
          pending: null,
          actionError: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof OAuthAuthorizationError) {
          if (error.reason === "session-missing") {
            redirectToLogin();
            return;
          }
          if (error.reason === "invalid") {
            setState({ status: "invalid" });
            return;
          }
          setState({ status: "error", message: error.message });
          return;
        }
        setState({ status: "error", message: "인가 요청을 확인하지 못했습니다" });
      });

    return () => {
      cancelled = true;
    };
  }, [authorizationId, attempt, redirectToLogin]);

  useEffect(() => {
    if (!authorizationId) return;

    let cancelled = false;
    fetchAuthSession()
      .then((session) => {
        if (!cancelled) setSignupRequired(!session.signedUp);
      })
      .catch(() => {
        // 회원 여부는 안내일 뿐이다 — 조회 실패로 동의 화면을 막지 않는다
      });

    return () => {
      cancelled = true;
    };
  }, [authorizationId]);

  const decide = useCallback(
    async (decision: ConsentDecision) => {
      if (state.status !== "ready" || state.pending) return;
      const { authorization } = state;
      setState({ ...state, pending: decision, actionError: null });

      try {
        const redirectUrl =
          decision === "approve"
            ? await approveOAuthAuthorization(authorization.authorizationId)
            : await denyOAuthAuthorization(authorization.authorizationId);
        setState({ status: "redirecting" });
        window.location.assign(redirectUrl);
      } catch (error) {
        if (error instanceof OAuthAuthorizationError) {
          if (error.reason === "session-missing") {
            redirectToLogin();
            return;
          }
          if (error.reason === "invalid") {
            setState({ status: "invalid" });
            return;
          }
        }
        setState({
          status: "ready",
          authorization,
          pending: null,
          actionError: ACTION_ERROR_MESSAGE[decision],
        });
      }
    },
    [state, redirectToLogin],
  );

  const approve = useCallback(() => decide("approve"), [decide]);
  const deny = useCallback(() => decide("deny"), [decide]);
  /*
   * 다시 시도 — `loading`으로 되돌리는 것을 효과 안이 아니라 여기서 한다. 효과 안의 동기
   * setState는 렌더를 한 번 더 유발해 린트가 막는 자리다(features/share와 같은 판단).
   */
  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { state, signupRequired, approve, deny, retry };
}
