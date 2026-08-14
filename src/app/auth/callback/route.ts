import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/shared/config/routes";
import { safeNextPath } from "@/shared/lib/next-path";
import { createClient } from "@/shared/lib/supabase/server";

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
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  /*
   * next는 쿼리로 들어오는 값이라 조작할 수 있다. 검증 없이 `${origin}${next}`로 이어 붙이면
   * `//evil.example` 같은 값에 오픈 리다이렉트가 뚫린다.
   */
  const next = safeNextPath(searchParams.get("next"), ROUTES.dashboard);

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

  return NextResponse.redirect(new URL(next, origin));
}
