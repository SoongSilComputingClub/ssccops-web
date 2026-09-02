import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/shared/config/routes";
import { safeNextPath } from "@/shared/lib/next-path";

/*
 * 미들웨어가 가르는 것은 "인증됐는가" 하나다.
 *
 * "가입했는가"까지 여기서 판정하려면 요청마다 ssccops-server 세션 조회가 하나씩 붙는다
 * (Cloudflare Workers 배포에서 지연·비용에 직결된다). 그래서 가입 여부 분기는 세션을 이미
 * 들고 있는 클라이언트 게이트(AuthGate · SignupGate)에 맡긴다.
 *
 * /signup·/signup/complete는 더 이상 공개 경로가 아니다 — 인증은 필요하되 가입 완료 여부는
 * SignupGate가 가른다. 예전에는 PUBLIC_PATHS에 있어 미인증 사용자도 가입 화면을 통과했다.
 *
 * /f/{formId} 공개 폼도 마찬가지로 공개 경로가 아니다. 링크 자체는 여전히 누구에게나
 * 열려 있지만(주소를 아는 사람은 누구나 연다) 응답하려면 회원이어야 한다 — 미인증이면
 * /login?next=/f/{formId} 로 보내고, 가입까지 마친 뒤 원래 폼으로 되돌아온다.
 * 제출 완료 화면(/f/{formId}/done)도 같은 정책이라 /f/ 접두사째로 보호 대상이다.
 */
const PUBLIC_PATHS: string[] = [ROUTES.login];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/auth/")) return true;
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** 세션 쿠키를 리프레시하고, 미인증 사용자를 보호 라우트에서 /login으로 리다이렉트한다 */
export async function updateSession(request: NextRequest) {
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

  // getSession()은 쿠키만 읽어 재검증하지 않으므로, 서버에서 검증되는 getUser()를 사용한다
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.login;
    // 재로그인 후 원래 가려던 곳으로 돌아가도록 쿼리스트링까지 함께 실어 준다
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(url);
  }

  if (user && pathname === ROUTES.login) {
    // 세션이 살아 있는데 로그인 화면으로 돌아온 경우에도 ?next= 목적지를 존중한다
    const next = safeNextPath(request.nextUrl.searchParams.get("next"), ROUTES.dashboard);
    return NextResponse.redirect(new URL(next, request.url));
  }

  return response;
}
