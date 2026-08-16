/**
 * 로그인 후 돌아갈 경로(`?next=`)를 검증한다.
 *
 * 이 값은 쿼리스트링으로 들어오므로 외부에서 조작할 수 있다. `https://evil.example` 같은
 * 절대 URL이나 `//evil.example`(프로토콜 상대 URL — 브라우저는 외부 도메인으로 읽는다)을
 * 그대로 이어 붙이면 오픈 리다이렉트가 된다. 내부 경로가 아니면 조용히 기본값으로 되돌린다.
 */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/")) return fallback;
  // `//host` 와 `/\host` 는 둘 다 브라우저가 외부 호스트로 해석한다
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/**
 * `path` 에 검증된 `?next=` 를 붙인다.
 *
 * 복귀 목적지를 zustand가 아니라 쿼리스트링으로 나르는 이유는 새로고침에 견디기 때문이다
 * (예전 `pendingAuthUser`는 가입 도중 새로고침하면 통째로 사라졌다). 다만 그만큼 사용자가
 * 값을 조작할 수 있으므로 붙이기 전에도 {@link safeNextPath}를 한 번 통과시킨다.
 *
 * 목적지가 어차피 기본값이면 파라미터를 붙이지 않는다 — `/signup?next=%2Fdashboard` 같은
 * 주소는 읽는 사람에게 아무것도 알려주지 않으면서 주소창만 지저분하게 만든다.
 */
export function withNextParam(
  path: string,
  next: string | null | undefined,
  fallback: string,
): string {
  const target = safeNextPath(next, fallback);
  if (target === fallback) return path;
  return `${path}?next=${encodeURIComponent(target)}`;
}

/**
 * 지금 브라우저가 열고 있는 경로 — 인증 흐름으로 빠져나가기 직전에 `?next=` 로 실을 값이다.
 *
 * `useSearchParams()`를 쓰지 않는 것은, 이 값을 필요로 하는 곳이 (admin) 레이아웃과
 * 공개 폼 레이아웃처럼 화면 전체를 감싸는 게이트라서다. 그 위치에서 훅을 쓰면 정적
 * 프리렌더가 통째로 Suspense 경계를 요구하게 된다. 게이트는 이미 이펙트 안에서만
 * 리다이렉트하므로 그 시점에는 window가 항상 존재한다.
 */
export function currentPath(): string | null {
  if (typeof window === "undefined") return null;
  return `${window.location.pathname}${window.location.search}`;
}
