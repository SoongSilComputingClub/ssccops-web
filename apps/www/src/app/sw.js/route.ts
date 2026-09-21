import { NextResponse } from "next/server";
import { buildServiceWorker } from "@ssccops/pwa";

/*
 * `GET /sw.js` — 서비스워커 (#607 · ssccops#449 · ADR-0045). admin #604와 같은 자리다.
 *
 * `public/sw.js` 파일이 아니라 라우트 핸들러가 `@ssccops/pwa`의 소스 문자열을 내준다 — 캐시 이름에
 * 빌드 sha(`NEXT_PUBLIC_GIT_SHA` · `next.config.ts`가 인라인)를 넣으려면 빌드마다 파일을 다시 써야
 * 하는데, 그 단계는 Vercel·OpenNext 양쪽에서 검증할 것이 하나 더 는다(플랫폼 중립 · ADR-0030).
 * 라우트 핸들러는 `/version`과 같은 자리라 이미 두 플랫폼에서 같은 뜻이다.
 *
 * ── 이 앱은 화면 이동과 정적 조각만 캐시한다 ──────────────────
 * `apiOrigin`이 null이다. 이 앱은 전 화면이 SSR이라 공개 페이지(홈·행사·학술·기록·소개)의 데이터는
 * HTML 안에 있고, 이동을 네트워크 우선 → 캐시로 다루면 «방문한 것이 오프라인에서도 열린다»가
 * 그것으로 끝난다. 브라우저에서 API를 부르는 화면은 신청서·공개 폼(초안 저장·제출)뿐인데 오프라인에서
 * 초안을 그려 봐야 저장이 안 되고, 캐시하면 로그아웃 때 비워야 할 것(admin의 `CLEAR_CACHE`)이 이
 * 앱에도 생긴다. 얻는 것 없이 지울 것만 는다.
 *
 * `appOrigins`도 비어 있다 — www에는 푸시가 없다(ssccops#449 «푸시를 넣지 않는다»). 워커 소스의
 * push·notificationclick 핸들러는 남지만 구독이 없어 울리지 않는다.
 *
 * - `Cache-Control: no-cache` — 브라우저는 24시간마다 워커 스크립트를 다시 받는데, CDN이 옛
 *   스크립트를 들고 있으면 새 배포 뒤에도 옛 캐시 이름으로 돈다. `force-dynamic`이 같은 이유.
 * - `Service-Worker-Allowed: /` — 스코프가 `/`이고 스크립트도 `/sw.js`라 없어도 되지만, 스크립트를
 *   옮기게 되면 이 헤더가 없어서 스코프가 좁아지는 종류의 실패라 처음부터 둔다.
 * - 미들웨어 매처(`/me/*`·신청·공개 폼)가 좁아 이 경로는 원래 잡히지 않는다 — 넓힐 때 `/sw.js`·
 *   `/offline`은 빼야 한다(워커 스크립트는 리다이렉트를 못 따라간다).
 */
export const dynamic = "force-dynamic";

export function GET() {
  const source = buildServiceWorker({
    cacheVersion: process.env.NEXT_PUBLIC_GIT_SHA ?? "unknown",
    offlinePath: "/offline",
    apiOrigin: null,
    appOrigins: {},
    app: "WWW",
  });
  return new NextResponse(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/",
    },
  });
}
