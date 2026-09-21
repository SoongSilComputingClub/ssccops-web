/*
 * Vercel에 떠 있을 때만 참 (#600 · ssccops#443).
 *
 * `@vercel/analytics`·`@vercel/speed-insights`의 스크립트는 자기 도메인의 `/_vercel/insights/…`를
 * 부른다 — dev는 Cloudflare Workers라(ADR-0030) 그 경로가 없어 404가 콘솔에 쌓인다. 그래서
 * 컴포넌트를 무조건 싣지 않고 이 값으로 가른다. `VERCEL`은 Vercel이 빌드·런타임에 넣는 값이고
 * `NEXT_PUBLIC_`이 아니라 **브라우저 번들에는 안 실린다** — 그래서 판정은 루트 레이아웃(서버
 * 컴포넌트)에서 하고, 클라이언트 컴포넌트는 그 결과로 마운트되거나 안 된다. 로컬도 거짓이다.
 */
export const ON_VERCEL = process.env.VERCEL === "1";
