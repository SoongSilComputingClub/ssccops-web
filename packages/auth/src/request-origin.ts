/**
 * 이 요청이 들어온 **공개 오리진** — 브라우저 주소창에 떠 있는 그 주소.
 *
 * `new URL(request.url).origin`을 쓰지 않는 것이 이 함수가 있는 이유다. Vercel·Cloudflare
 * (OpenNext)는 `request.url`에 공개 도메인을 넣어 주지만, 컨테이너의 standalone 서버
 * (`node server.js`)는 **자기가 듣는 주소**로 만든다 — Dockerfile의 `HOSTNAME=0.0.0.0`·`PORT=3000`.
 * 스킴만 프록시의 `x-forwarded-proto`를 따르므로 `https://0.0.0.0:3000`이라는 어디에도 없는
 * 오리진이 나오고, 로그인 콜백이 사용자를 그리로 보냈다(#696).
 *
 * 미들웨어의 리다이렉트는 이 문제가 없다 — Next가 같은 오리진 리다이렉트를 상대 경로로 바꿔
 * 내보낸다. **라우트 핸들러가 직접 만드는 절대 주소와 서버 쪽 `fetch`만 걸린다.**
 *
 * 호스트는 `x-forwarded-host` → `host`, 스킴은 `x-forwarded-proto` → `request.url`의 스킴 순이다 —
 * 공개 폼 카드(`apps/www/src/app/f/[formId]/page.tsx`)가 먼저 쓴 순서다. 헤더를 믿어도 되는 것은
 * 앞단 프록시가 클라이언트가 보낸 값을 **덮어쓰기** 때문이다(Coolify의 Traefik·Vercel 둘 다
 * `X-Forwarded-Host: evil.example`을 실어 보내도 자기 도메인이 나오는 것을 확인했다 · #696).
 * 프록시를 여럿 거치면 `a, b`로 이어지므로 첫 값 — 클라이언트에 가장 가까운 프록시가 본 값 — 만 쓴다.
 *
 * 헤더가 하나도 없으면 `request.url`로 떨어진다. 로컬 `next dev`도 `host`를 싣고 오므로 실제로
 * 여기까지 오는 것은 헤더 없이 손으로 만든 `Request`뿐이다.
 */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = firstValue(request.headers.get("x-forwarded-host")) ?? request.headers.get("host");
  if (!host) return url.origin;
  const proto = firstValue(request.headers.get("x-forwarded-proto")) ?? url.protocol.slice(0, -1);
  return `${proto}://${host}`;
}

/** `a, b` → `a`. 비었으면 `null` — `??`가 다음 후보로 넘어가게 한다 */
function firstValue(header: string | null): string | null {
  return header?.split(",")[0]?.trim() || null;
}
