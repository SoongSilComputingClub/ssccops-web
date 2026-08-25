/**
 * OAuth 왕복 동안 "로그인 후 돌아갈 경로"를 나르는 쿠키.
 *
 * 목적지를 `redirectTo` 쿼리로 실으면 안 된다. Supabase(GoTrue)는 Redirect URLs 화이트리스트를
 * **프래그먼트만 잘라낸 전체 URL**에 대해 매칭하므로 쿼리 스트링도 매칭 대상이고, 어긋나면
 * 오류 없이 **조용히 Site URL로 대체한다** — 로컬에서 시작한 로그인이 배포 도메인에서 끝나고
 * 그쪽에는 PKCE code_verifier 쿠키가 없어 실패한다(어드민이 ssccops#84로 실제로 밟았다).
 *
 * 그래서 `redirectTo`는 `<오리진>/auth/callback` 하나로 고정하고 목적지는 쿠키로 옮긴다.
 * 읽는 쪽이 서버 라우트 핸들러(app/auth/callback/route.ts)라 sessionStorage는 쓸 수 없다.
 */
export const OAUTH_NEXT_COOKIE = "sscc-oauth-next";

/** 쿠키 경로를 콜백 라우트로 좁힌다 — 이 값을 읽는 곳이 거기 하나뿐이다 */
export const OAUTH_NEXT_COOKIE_PATH = "/auth/callback";

/** OAuth 왕복(구글 동의 화면 포함)에 필요한 만큼만. 남겨 두면 다음 로그인이 지난 목적지로 간다 */
const MAX_AGE_SECONDS = 600;

/**
 * `signInWithOAuth` 직전에 목적지를 남긴다 — 브라우저에서만 호출한다.
 *
 * `SameSite=Lax`인 이유: 돌아오는 길은 Supabase → 이 앱의 **교차 사이트 top-level 이동**이다.
 * `Strict`면 그 요청에 쿠키가 붙지 않아 목적지가 통째로 사라진다.
 */
export function rememberOAuthNext(next: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${OAUTH_NEXT_COOKIE}=${encodeURIComponent(next)}` +
    `; Path=${OAUTH_NEXT_COOKIE_PATH}; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}
