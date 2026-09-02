import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 Supabase 클라이언트 — 쿠키에서 세션을 읽는다.
 *
 * 이 앱은 전 화면이 서버 컴포넌트라(#141) '내 신청'도 SSR로 그린다. 그래서 사용자 토큰을
 * 꺼내는 자리도 브라우저가 아니라 여기다.
 *
 * `setAll`의 예외를 삼키는 것은 **서버 컴포넌트가 쿠키를 쓸 수 없기 때문**이다. 갱신된 쿠키를
 * 실제로 심는 것은 미들웨어(shared/lib/supabase/proxy.ts)이고, 그쪽이 '내 신청' 경로에서 먼저
 * 돌아 세션을 새로 고친 뒤 페이지가 렌더된다 — 여기서 못 심어도 다음 요청에 반영된다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서 호출된 경우 — 미들웨어가 세션을 갱신하므로 무시해도 안전
          }
        },
      },
    },
  );
}
