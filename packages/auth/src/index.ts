/*
 * @ssccops/auth — 세 앱이 함께 쓰는 로그인 왕복 · 세션 유틸.
 *
 * `ssccops#243`이 UI를 올리면서 **인프라 계열은 손대지 않고** 남겨 두었다. 한 PR이 세 앱의
 * 인증 경로를 동시에 건드리면 로그인이 깨졌을 때 어느 변경 탓인지 가를 수 없어서다. 이
 * 패키지는 그 나머지를 걷은 것이다(ssccops-web#329) — **합치기 전에 앱마다 diff를 먼저 읽고,
 * 코드가 같은 것만 올린다.**
 *
 * ── 여기 있는 것 ────────────────────────────────────────────
 * | | |
 * |---|---|
 * | `next-path` | `?next=` 목적지 검증. 세 앱이 글자까지 같았다 (`withNextParam`만 admin 전용) |
 * | `oauth-next` | OAuth 왕복 목적지 쿠키. 세 앱이 코드까지 같았다(주석만 길이가 달랐다) |
 * | `supabase/client` | 브라우저 클라이언트. **세 앱의 코드가 바이트까지 같았다** |
 * | `supabase/server` | 서버 클라이언트. 같음 — `setAll` 예외를 삼키는 이유까지 같다 |
 * | `supabase/proxy` | 세션 갱신. **여기만 admin이 달랐다** — 아래 |
 *
 * ── `proxy.ts`는 왜 달랐고 어떻게 합쳤는가 ──────────────────
 * admin은 미인증 요청을 `/login`으로 밀어내는 **가드**였고, www·lms는 만료 임박 토큰을
 * 새로 고치는 것만 하는 **갱신기**였다(두 앱에는 밀어낼 로그인 화면이 없다). 갱신 부분은
 * 세 앱이 글자까지 같았고 가드만 admin에 얹혀 있었다.
 *
 * 그래서 **가드를 앱이 주입한다**(`SessionGuard`). 로그인 경로·기본 목적지·공개 경로 판정은
 * 앱마다 다른 값이지 공유할 코드가 아니다 — 특히 `PUBLIC_PATHS`는 admin의 공유 링크 착지
 * (`/s/{token}`, ssccops#200)가 크롤러를 통과시키려고 들어 있는 것이라, 여기로 올리면
 * www·lms에도 뜻 없는 예외가 생긴다. 주지 않으면 www·lms의 오늘 동작 그대로다.
 *
 * ── 여기 없는 것과 그 이유 ──────────────────────────────────
 * | | |
 * |---|---|
 * | `api/client.ts` 계열 | **admin만 401·403 리다이렉트까지 끝낸다**(#243이 근거를 남기고 뺐다) |
 * | 미들웨어 매처 | 앱마다 정반대다 — www는 두 경로, lms는 전 경로, admin은 정적 자산만 제외 |
 * | `ROUTES` | 앱마다 다른 화면 목차다. 이 패키지의 함수가 기본 경로를 인자로 받는 이유다 |
 * | `PUBLIC_PATHS` | admin의 값이다 — `apps/admin/src/shared/lib/supabase/guard.ts` |
 *
 * ── Tailwind `@source` 는 필요 없다 ─────────────────────────
 * 이 패키지에는 마크업이 없다(전부 `.ts`). `packages/ui`·`packages/form-renderer`가 세 앱
 * `globals.css`에 `@source`로 선언돼 있는 것은 그쪽이 클래스를 들고 있기 때문이다(#316).
 * **여기에 컴포넌트를 더할 일이 생기면 그때 세 앱에 `@source` 한 줄씩을 함께 더한다** —
 * Tailwind는 없는 클래스를 조용히 건너뛰어 타입·린트·빌드가 전부 통과한다.
 */

/*
 * `supabase/*`는 이 배럴에서 내보내지 않는다 — 진입점을 나눈다
 * (`@ssccops/auth/supabase/{client,server,proxy}`). `server.ts`는 `next/headers`를,
 * `proxy.ts`는 `next/server`를 부르는데, 한 배럴에 섞으면 클라이언트 컴포넌트가
 * `safeNextPath` 하나를 가져오면서 서버 전용 모듈까지 함께 끌어온다.
 */
export { safeNextPath, withNextParam, currentPath } from "./next-path";
export { OAUTH_NEXT_COOKIE, OAUTH_NEXT_COOKIE_PATH, rememberOAuthNext } from "./oauth-next";
