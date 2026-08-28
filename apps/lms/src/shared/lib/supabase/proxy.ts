import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/*
 * 세션 쿠키 갱신 — **가드가 아니다.**
 *
 * 어드민의 같은 파일은 미인증 요청을 /login으로 돌려보내지만, 이 앱에는 로그인 화면이라는 것이
 * 없다(로그인은 지금 보고 있는 화면 위에서 버튼 하나로 시작한다 — apps/www가 세운 규약).
 * 미인증 사용자를 어디론가 보내려 하면 갈 곳이 없어 리다이렉트가 돌기만 한다 — 그래서 이
 * 미들웨어가 하는 일은 **만료가 임박한 access token을 새로 고쳐 쿠키에 심는 것** 하나뿐이고,
 * "로그인했는가"의 판단과 안내는 화면이 한다(전 화면이 로그인 필수라 공용 로그인 게이트가
 * 그 자리에서 로그인 유도를 그린다 · #169).
 *
 * apps/www와 갈리는 것은 **매처 범위**뿐이다. www는 익명 공개가 본체라 매처를 로그인 화면
 * 둘로 좁혔지만, 이 앱은 익명 화면이 없어 전 화면을 잡는다(src/middleware.ts). 갱신이 없으면
 * access token이 만료된 뒤 첫 조회가 그대로 401이 되어, 로그인은 살아 있는데 화면만 "다시
 * 로그인해 주세요"가 되는 상태가 한 시간마다 반복된다.
 */
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

  // getSession()은 쿠키만 읽어 재검증하지 않는다 — 갱신을 일으키는 것은 getUser()다
  await supabase.auth.getUser();

  return response;
}
