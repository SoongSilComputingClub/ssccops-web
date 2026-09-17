import { type AuthError, isAuthApiError, isAuthError } from "@supabase/supabase-js";
import { createClient } from "@ssccops/auth/supabase/client";
import {
  type OAuthAuthorization,
  OAuthAuthorizationError,
  type OAuthAuthorizationLookup,
} from "../model/types";

/*
 * supabase-js `auth.oauth` 호출 (ssccops#315 · ADR-0026).
 *
 * 세 메서드가 Supabase Auth의 `/oauth/authorizations/{id}`(GET)와 `.../consent`(POST
 * `{ action: "approve" | "deny" }`)를 부른다 — 브라우저 세션의 access token을 SDK가 실어
 * 보내므로 서버(ssccops-server)는 이 흐름에 없다.
 *
 * ── `skipBrowserRedirect: true`를 주는 이유 ────────────────────
 * SDK 기본값은 승인·거절 응답의 `redirect_url`로 **스스로** `window.location.assign`을 한다.
 * 그러면 훅이 "돌아가는 중" 상태를 그릴 틈 없이 화면이 바뀌고, 응답에 `redirect_url`이 없는
 * 경우(있어서는 안 되지만)가 조용히 아무 일도 안 하는 것으로 끝난다. 이동은 화면이 한다.
 *
 * ── 공식 문서에서 확인한 응답 모양 (2026-09-12) ─────────────────
 * https://supabase.com/docs/guides/auth/oauth-server/getting-started — 승인·거절 응답의
 * 필드는 `redirect_url`이다(`redirect_to`가 아니다). 조회 응답은 동의가 필요하면
 * `authorization_id`·`client`·`redirect_uri`·`scope`를, 이미 동의했으면 `redirect_url`만 준다.
 */

/**
 * `redirect_uri`에서 사용자가 판단할 값(호스트)만 꺼낸다.
 *
 * `new URL`이 실패하는 값(상대 경로 등)은 원문을 그대로 돌려준다 — 감추는 것보다 낫다.
 * 커스텀 스킴(`claude://…`)은 파싱은 되지만 host가 비어 오는 브라우저가 있어, 비면 원문이다.
 */
function hostOf(redirectUri: string): string {
  try {
    const host = new URL(redirectUri).host;
    return host || redirectUri;
  } catch {
    return redirectUri;
  }
}

/**
 * SDK 오류 → 화면이 가르는 이유.
 *
 * Supabase Auth는 없는·만료된·이미 처리된 인가 요청에 4xx를 준다. 401은 세션 문제이므로
 * 따로 두고, 나머지 4xx는 전부 «유효하지 않은 요청»이다 — 사용자가 할 수 있는 일이 "연결을
 * 다시 시작"으로 같기 때문에 더 가르지 않는다. 5xx·네트워크는 다시 시도할 수 있다.
 */
function toFailure(error: AuthError): OAuthAuthorizationError {
  if (error.name === "AuthSessionMissingError") {
    return new OAuthAuthorizationError("session-missing", error.message);
  }
  if (isAuthApiError(error)) {
    if (error.status === 401) {
      return new OAuthAuthorizationError("session-missing", error.message);
    }
    if (error.status >= 400 && error.status < 500) {
      return new OAuthAuthorizationError("invalid", error.message);
    }
  }
  return new OAuthAuthorizationError("unknown", error.message);
}

/** SDK가 `{ data, error }` 대신 던지는 예외(fetch 실패 등)까지 같은 오류로 모은다 */
function rethrow(error: unknown): never {
  if (error instanceof OAuthAuthorizationError) throw error;
  if (isAuthError(error)) throw toFailure(error);
  throw new OAuthAuthorizationError(
    "unknown",
    error instanceof Error ? error.message : "인가 요청을 처리하지 못했습니다",
  );
}

/** 이미 동의한 요청이라 SDK가 `redirect_url`만 준 경우를 가른다 */
function redirectUrlOf(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const url = (data as { redirect_url?: unknown }).redirect_url;
  return typeof url === "string" && url.length > 0 ? url : null;
}

/** GET /oauth/authorizations/{id} — 동의 화면에 보일 값, 또는 이미 동의한 경우의 목적지 */
export async function fetchOAuthAuthorization(
  authorizationId: string,
): Promise<OAuthAuthorizationLookup> {
  try {
    const { data, error } =
      await createClient().auth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw toFailure(error);
    if ("authorization_id" in data) {
      const authorization: OAuthAuthorization = {
        authorizationId: data.authorization_id,
        clientName: data.client.name,
        clientUri: data.client.uri || null,
        redirectHost: hostOf(data.redirect_uri),
        scopes: data.scope ? data.scope.split(/\s+/).filter(Boolean) : [],
      };
      return { kind: "consent", authorization };
    }
    const redirectUrl = redirectUrlOf(data);
    if (!redirectUrl) {
      throw new OAuthAuthorizationError("invalid", "인가 요청 응답에 돌아갈 주소가 없습니다");
    }
    return { kind: "redirect", redirectUrl };
  } catch (error) {
    rethrow(error);
  }
}

/** POST …/consent `{ action: "approve" }` — 돌아갈 주소(인가 코드 포함) */
export async function approveOAuthAuthorization(authorizationId: string): Promise<string> {
  try {
    const { data, error } = await createClient().auth.oauth.approveAuthorization(
      authorizationId,
      { skipBrowserRedirect: true },
    );
    if (error) throw toFailure(error);
    const redirectUrl = redirectUrlOf(data);
    if (!redirectUrl) {
      throw new OAuthAuthorizationError("invalid", "승인 응답에 돌아갈 주소가 없습니다");
    }
    return redirectUrl;
  } catch (error) {
    rethrow(error);
  }
}

/** POST …/consent `{ action: "deny" }` — 돌아갈 주소(`error=access_denied` 포함) */
export async function denyOAuthAuthorization(authorizationId: string): Promise<string> {
  try {
    const { data, error } = await createClient().auth.oauth.denyAuthorization(
      authorizationId,
      { skipBrowserRedirect: true },
    );
    if (error) throw toFailure(error);
    const redirectUrl = redirectUrlOf(data);
    if (!redirectUrl) {
      throw new OAuthAuthorizationError("invalid", "거절 응답에 돌아갈 주소가 없습니다");
    }
    return redirectUrl;
  } catch (error) {
    rethrow(error);
  }
}
