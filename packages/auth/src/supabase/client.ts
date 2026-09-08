import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저 Supabase 클라이언트.
 *
 * 세 앱의 사본이 **바이트까지 같았다**(ssccops-web#329) — 감쌀 것도, 앱마다 다르게 줄
 * 옵션도 없다. 환경 변수 두 개는 `NEXT_PUBLIC_*`이라 앱의 빌드가 각자 인라인한다.
 *
 * 브라우저가 Supabase를 직접 부르는 곳은 **로그인 시작(signInWithOAuth)·로그아웃·세션 구독**
 * 셋뿐이다. 서버 데이터 조회에 쓸 토큰을 여기서 꺼내지 않는다 — www·lms는 서버 컴포넌트가
 * (`shared/api/authed-client`), admin은 `shared/lib/api/client`가 각자 맡는다.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
