/**
 * OAuth 왕복 동안 "로그인 후 돌아갈 경로"를 나르는 쿠키.
 *
 * 예전에는 이 값을 `redirectTo` 쿼리로 실어 보냈다 —
 * `${origin}/auth/callback?next=${encodeURIComponent(next)}`.
 * 그런데 Supabase(GoTrue)는 Redirect URLs 화이트리스트를 **프래그먼트만 잘라낸 전체 URL**에
 * 대해 매칭한다(`internal/utilities/request.go`, `strings.Cut(redirectURL, "#")`). 즉 쿼리
 * 스트링도 매칭 대상이라, 대시보드에 `http://localhost:3000/auth/callback`을 경로까지 정확히
 * 등록해 두어도 실제로 나가는 `...?next=%2Fdashboard`와는 일치하지 않는다. 일치하지 않으면
 * GoTrue는 오류를 내지 않고 **조용히 Site URL로 대체한다** — 로컬에서 시작한 로그인이 배포
 * 도메인에서 끝나고, 그쪽에는 PKCE code_verifier 쿠키가 없어 exchange_failed로 죽는다
 * (ssccops#84).
 *
 * 화이트리스트를 `/**` 로 넓히면 그 오리진의 임의 경로가 리다이렉트 대상이 되므로, 반대로
 * `redirectTo`에서 쿼리를 걷어내고 목적지를 쿠키로 옮겼다. 등록값이 `<오리진>/auth/callback`
 * 하나로 끝나고, 환경이 늘어도 같은 함정을 다시 밟지 않는다.
 *
 * 목적지를 읽는 쪽이 서버 라우트 핸들러(app/auth/callback/route.ts)라 sessionStorage는 쓸 수
 * 없다. 쿠키여야 한다.
 */
export const OAUTH_NEXT_COOKIE = "sscc-oauth-next";

/**
 * 쿠키 경로를 콜백 라우트로 좁힌다.
 *
 * `/` 로 두면 모든 요청에 딸려 나가는데, 이 값은 콜백 라우트 한 곳에서만 읽는다.
 * 미들웨어 매처가 `auth/`를 제외하고 있어 이 경로에서 다른 처리와 겹칠 일도 없다.
 */
export const OAUTH_NEXT_COOKIE_PATH = "/auth/callback";

/** OAuth 왕복(구글 동의 화면 포함)에 필요한 만큼만. 남겨 두면 다음 로그인이 지난 목적지로 간다 */
const MAX_AGE_SECONDS = 600;

/**
 * `signInWithOAuth` 직전에 목적지를 남긴다 — 브라우저에서만 호출한다.
 *
 * `SameSite=Lax`인 이유: 돌아오는 길은 Supabase → 이 앱의 **교차 사이트 top-level 이동**이다.
 * `Strict`면 그 요청에 쿠키가 붙지 않아 목적지가 통째로 사라진다. `Lax`는 top-level GET
 * 이동에는 쿠키를 실어 주므로 이 흐름에 맞고, 그 이상 넓힐 이유는 없다.
 */
export function rememberOAuthNext(next: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${OAUTH_NEXT_COOKIE}=${encodeURIComponent(next)}` +
    `; Path=${OAUTH_NEXT_COOKIE_PATH}; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}
