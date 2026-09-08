import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "../next-path";

/*
 * 미들웨어가 요청마다 하는 일 — **세션 쿠키 갱신**이 본체이고, 가드는 앱이 얹는다.
 *
 * ── 세 앱이 갈렸던 자리 (ssccops-web#329) ───────────────────
 * 갱신 부분(`createServerClient` + `getUser()` + 쿠키 되싣기)은 세 앱이 글자까지 같았다.
 * 다른 것은 **admin에만 가드가 얹혀 있었다**는 것 하나다 — 미인증 요청을 `/login`으로
 * 밀어내고, 로그인한 사용자가 `/login`으로 돌아오면 `?next=`로 되돌린다.
 *
 * www·lms에는 그 가드가 없다. **밀어낼 로그인 화면이 없기 때문**이다 — 두 앱의 로그인은
 * 지금 보고 있는 화면 위에서 버튼 하나로 시작하고, "로그인했는가"의 안내는 화면이 직접
 * 그린다(www는 '내 신청', lms는 공용 로그인 게이트 · #169). 여기서 리다이렉트를 걸면 갈 곳이
 * 없어 돌기만 한다.
 *
 * ── 그래서 가드를 합치지 않고 주입한다 ──────────────────────
 * `PUBLIC_PATHS`·로그인 경로·기본 목적지는 **앱마다 다른 값**이지 공유할 코드가 아니다.
 * 특히 admin의 `PUBLIC_PATHS`에 `/s`(공유 링크 착지 · ssccops#200)가 들어 있는 것은 크롤러가
 * 정의상 미인증이라 리다이렉트되면 `generateMetadata`가 아예 돌지 않기 때문인데, 그 사정은
 * admin에만 있다. 여기로 올리면 www·lms에도 뜻 없는 예외가 생긴다.
 *
 * `guard`를 주지 않으면 갱신만 하고 끝난다 — www·lms의 오늘 동작 그대로다.
 */

/**
 * 미들웨어가 미인증 요청을 밀어낼 때 필요한 앱별 값.
 *
 * 주는 앱이 지금은 admin 하나다. 그래도 선택 인자로 둔 것은, 셋 중 둘이 가드를 쓰지 않는
 * 것이 이 앱들의 설계(로그인 화면 없음)이지 아직 안 만든 것이 아니기 때문이다.
 */
export type SessionGuard = {
  /** 미인증 요청을 보낼 로그인 화면 */
  loginPath: string;
  /** `?next=`가 없거나 믿을 수 없을 때 돌아갈 기본 화면 */
  fallbackPath: string;
  /** 미인증이어도 통과시킬 경로인가 — 공유 링크 착지·OAuth 콜백처럼 */
  isPublicPath: (pathname: string) => boolean;
};

/**
 * 세션 쿠키를 리프레시한다. `guard`를 주면 미인증 요청을 로그인 화면으로 돌려보낸다.
 *
 * 갱신이 없으면 access token이 만료된 뒤 첫 조회가 그대로 401이 되어, 로그인은 살아 있는데
 * 화면만 "다시 로그인해 주세요"가 되는 상태가 한 시간마다 반복된다.
 */
export async function updateSession(request: NextRequest, guard?: SessionGuard) {
  const { pathname, search } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getSession()은 쿠키만 읽어 재검증하지 않는다 — 갱신을 일으키는 것은 getUser()다
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!guard) return response;

  if (!user && !guard.isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = guard.loginPath;
    // 재로그인 후 원래 가려던 곳으로 돌아가도록 쿼리스트링까지 함께 실어 준다
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(url);
  }

  if (user && pathname === guard.loginPath) {
    // 세션이 살아 있는데 로그인 화면으로 돌아온 경우에도 ?next= 목적지를 존중한다
    const next = safeNextPath(request.nextUrl.searchParams.get("next"), guard.fallbackPath);
    return NextResponse.redirect(new URL(next, request.url));
  }

  return response;
}
