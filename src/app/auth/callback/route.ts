import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/shared/config/routes";
import { safeNextPath } from "@/shared/lib/next-path";
import { OAUTH_NEXT_COOKIE, OAUTH_NEXT_COOKIE_PATH } from "@/shared/lib/oauth-next";
import { createClient } from "@/shared/lib/supabase/server";

/**
 * 목적지 쿠키를 지운다 — 성공·실패를 가리지 않고 이 라우트를 빠져나가는 모든 응답에 붙인다.
 *
 * 남겨 두면 다음 로그인이 지난 목적지로 간다. 실패 경로에서도 지워야 하는 것은, 실패한
 * 로그인의 목적지가 그대로 살아 있다가 다음 시도에 되살아나면 사용자가 이유를 알 수 없기
 * 때문이다. 쿠키를 심을 때와 **같은 Path**를 줘야 지워진다.
 */
function clearNextCookie(response: NextResponse) {
  response.cookies.set(OAUTH_NEXT_COOKIE, "", {
    path: OAUTH_NEXT_COOKIE_PATH,
    maxAge: 0,
  });
  return response;
}

/**
 * 실패를 로그인 화면으로 되돌린다.
 *
 * 예전에는 원인을 가리지 않고 `?error=oauth_failed` 하나로 덮어써서, 사용자가 취소한 것인지
 * 코드 교환이 깨진 것인지 로그를 봐도 알 수 없었다. 원인 코드와 설명을 그대로 옮긴다.
 * next도 함께 넘겨 다시 로그인했을 때 원래 가려던 곳으로 갈 수 있게 한다.
 */
function loginRedirect(
  origin: string,
  next: string,
  error: string,
  description?: string | null,
) {
  const url = new URL(ROUTES.login, origin);
  url.searchParams.set("error", error);
  if (description) url.searchParams.set("error_description", description);
  if (next !== ROUTES.dashboard) url.searchParams.set("next", next);
  return clearNextCookie(NextResponse.redirect(url));
}

/**
 * 로그인 후 돌아갈 경로를 꺼낸다.
 *
 * 쿠키가 먼저다 — 로그인 화면이 `signInWithOAuth` 직전에 심는 값이고, `redirectTo`에서
 * 쿼리를 걷어낸 이유가 그것이다 (shared/lib/oauth-next.ts · ssccops#84).
 * `?next=` 는 폴백으로 남긴다. 아직 이 라우트로 직접 들어오는 예전 링크가 있을 수 있고,
 * 읽어 두는 비용이 없다.
 *
 * 어느 쪽으로 들어왔든 조작 가능한 값이므로 safeNextPath로 한 번 거른다.
 */
function resolveNext(request: NextRequest): string {
  const fromCookie = request.cookies.get(OAUTH_NEXT_COOKIE)?.value;
  if (fromCookie) {
    // 심을 때 encodeURIComponent 했다. 깨진 인코딩에 라우트 전체를 죽이지는 않는다
    let decoded: string;
    try {
      decoded = decodeURIComponent(fromCookie);
    } catch {
      decoded = "";
    }
    if (decoded) return safeNextPath(decoded, ROUTES.dashboard);
  }
  return safeNextPath(new URL(request.url).searchParams.get("next"), ROUTES.dashboard);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  /*
   * next는 사용자가 조작할 수 있는 값이다. 검증 없이 `${origin}${next}`로 이어 붙이면
   * `//evil.example` 같은 값에 오픈 리다이렉트가 뚫린다 — resolveNext가 걸러 준다.
   */
  const next = resolveNext(request);

  // 사용자가 동의 화면에서 취소하면 Supabase가 code 없이 error를 붙여 돌려보낸다
  const oauthError = searchParams.get("error");
  if (oauthError) {
    return loginRedirect(origin, next, oauthError, searchParams.get("error_description"));
  }

  const code = searchParams.get("code");
  if (!code) {
    return loginRedirect(origin, next, "missing_code");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return loginRedirect(origin, next, "exchange_failed", error.message);
  }

  return clearNextCookie(NextResponse.redirect(new URL(next, origin)));
}
