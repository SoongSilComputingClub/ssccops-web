import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저 Supabase 클라이언트.
 *
 * 이 앱에서 브라우저가 Supabase를 부르는 곳은 **로그인 시작(signInWithOAuth)·로그아웃·세션
 * 구독** 셋뿐이다. 서버 API 호출은 전부 서버 컴포넌트에서 일어나므로(shared/api/authed-client)
 * 여기서 토큰을 꺼내 fetch에 싣는 코드는 없다.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
