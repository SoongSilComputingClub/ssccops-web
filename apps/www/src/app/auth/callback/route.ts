import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_ERROR_QUERY, ROUTES } from "@/shared/config/routes";
import { safeNextPath } from "@/shared/lib/next-path";
import { OAUTH_NEXT_COOKIE, OAUTH_NEXT_COOKIE_PATH } from "@/shared/lib/oauth-next";
import { createClient } from "@/shared/lib/supabase/server";

/**
 * 목적지 쿠키를 지운다 — 성공·실패를 가리지 않고 이 라우트를 빠져나가는 모든 응답에 붙인다.
 * 남겨 두면 다음 로그인이 지난 목적지로 간다. 심을 때와 **같은 Path**를 줘야 지워진다.
 */
function clearNextCookie(response: NextResponse) {
  response.cookies.set(OAUTH_NEXT_COOKIE, "", {
    path: OAUTH_NEXT_COOKIE_PATH,
    maxAge: 0,
  });
  return response;
}

/**
 * 로그인 실패를 '내 신청' 화면으로 되돌린다.
 *
 * 어드민은 로그인 화면으로 돌려보내지만 이 앱에는 그런 화면이 없다. 대신 **로그인할 이유가
 * 있는 유일한 화면**인 '내 신청'으로 보낸다 — 거기서만 실패 사유를 설명하고 다시 로그인
 * 버튼을 내줄 수 있다. 사유 코드를 그대로 실어 보내는 것은, 하나로 뭉뚱그리면 사용자가
 * 취소한 것인지 코드 교환이 깨진 것인지 로그를 봐도 가릴 수 없기 때문이다.
 */
function failureRedirect(origin: string, error: string) {
  const url = new URL(ROUTES.myApplications, origin);
  url.searchParams.set(LOGIN_ERROR_QUERY, error);
  return clearNextCookie(NextResponse.redirect(url));
}

/**
 * 로그인 후 돌아갈 경로를 꺼낸다.
 *
 * 쿠키가 먼저다 — 로그인 버튼이 `signInWithOAuth` 직전에 심는 값이고, `redirectTo`에서 쿼리를
 * 걷어낸 이유가 그것이다(shared/lib/oauth-next.ts). `?next=`는 폴백으로만 읽는다.
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
    if (decoded) return safeNextPath(decoded, ROUTES.myApplications);
  }
  return safeNextPath(
    new URL(request.url).searchParams.get("next"),
    ROUTES.myApplications,
  );
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // 사용자가 동의 화면에서 취소하면 Supabase가 code 없이 error를 붙여 돌려보낸다
  const oauthError = searchParams.get("error");
  if (oauthError) return failureRedirect(origin, oauthError);

  const code = searchParams.get("code");
  if (!code) return failureRedirect(origin, "missing_code");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failureRedirect(origin, "exchange_failed");

  return clearNextCookie(NextResponse.redirect(new URL(resolveNext(request), origin)));
}
