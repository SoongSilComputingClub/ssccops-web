/**
 * 로그인 후 돌아갈 경로를 검증한다.
 *
 * 이 값은 쿠키·쿼리로 들어오므로 외부에서 조작할 수 있다. `https://evil.example` 같은 절대
 * URL이나 `//evil.example`(프로토콜 상대 URL — 브라우저는 외부 도메인으로 읽는다)을 그대로
 * 이어 붙이면 오픈 리다이렉트가 된다. 내부 경로가 아니면 조용히 기본값으로 되돌린다.
 */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/")) return fallback;
  // `//host` 와 `/\host` 는 둘 다 브라우저가 외부 호스트로 해석한다
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** 지금 브라우저가 열고 있는 경로 — 로그인으로 빠져나가기 직전에 남길 목적지다 */
export function currentPath(): string | null {
  if (typeof window === "undefined") return null;
  return `${window.location.pathname}${window.location.search}`;
}
