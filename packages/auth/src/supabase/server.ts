import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 Supabase 클라이언트 — 쿠키에서 세션을 읽는다.
 *
 * 세 앱의 사본이 **바이트까지 같았다**(ssccops-web#329, `catch` 안의 주석 문구만 달랐다).
 *
 * `setAll`의 예외를 삼키는 것은 **서버 컴포넌트가 쿠키를 쓸 수 없기 때문**이다. 갱신된 쿠키를
 * 실제로 심는 것은 미들웨어(`@ssccops/auth/supabase/proxy`)이고, 그쪽이 먼저 돌아 세션을 새로
 * 고친 뒤 페이지가 렌더된다 — 여기서 못 심어도 다음 요청에 반영된다.
 *
 * **미들웨어 매처에서 빠진 경로에서는 그 보정이 없다.** www는 매처를 세 경로로 좁혀 두었으므로
 * (`apps/www/src/middleware.ts`) 서버 컴포넌트에서 이 클라이언트를 새 경로에 쓸 때는 매처를
 * 함께 본다 — 갱신이 없으면 만료된 토큰으로 조회가 401이 된다.
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
