import { NextResponse } from "next/server";
import { buildServiceWorker } from "@ssccops/pwa";
import { deployMarks } from "@ssccops/ui";
import { appOrigins } from "@/shared/config/app-origins";

/*
 * `GET /sw.js` — 서비스워커 (#607 · #616 · ssccops#449 · ssccops#453 · ADR-0045). admin #604·lms #606과
 * 같은 자리다.
 *
 * `public/sw.js` 파일이 아니라 라우트 핸들러가 `@ssccops/pwa`의 소스 문자열을 내준다 — 캐시 이름에
 * 빌드 sha(`NEXT_PUBLIC_GIT_SHA` · `next.config.ts`가 인라인)를 넣으려면 빌드마다 파일을 다시 써야
 * 하는데, 그 단계는 Vercel·OpenNext 양쪽에서 검증할 것이 하나 더 는다(플랫폼 중립 · ADR-0030).
 * 라우트 핸들러는 `/version`과 같은 자리라 이미 두 플랫폼에서 같은 뜻이다.
 *
 * ── #616에서 `apiOrigin`·`appOrigins`가 생겼다 ──────────────────
 * #607에서는 둘 다 비어 있었다 — 전 화면이 SSR이라 공개 페이지의 데이터는 HTML 안에 있고, 브라우저에서
 * API를 부르는 화면은 신청서·공개 폼(초안 저장·제출)뿐이라 캐시할 것이 없었다. 알림(ssccops#453)이
 * 그 전제를 바꿨다: `/notifications`와 종 배지는 브라우저에서 `GET /v1/notifications*`를 부르고, 오프라인에서
 * 마지막으로 본 알림 목록이 열리는 것이 admin·lms와 같은 뜻이다. 그래서 `apiOrigin`은
 * `NEXT_PUBLIC_API_BASE_URL`의 오리진(`apiFetch`와 같은 값 — 비면 API 응답은 캐시하지 않는다)이고, 그 대가로
 * 로그아웃이 `CLEAR_CACHE`를 보낸다(`features/auth` `useAuthSession`). 초안 조회 GET도 같은 규칙에 든다 —
 * 네트워크 우선이라 온라인에서는 달라지는 것이 없다.
 *
 * `appOrigins`는 `shared/config/app-origins.ts` — ADMIN은 새 env `NEXT_PUBLIC_ADMIN_ORIGIN`, LMS는
 * `NEXT_PUBLIC_LMS_ORIGIN`. 알림을 눌렀을 때 `app`이 자기 앱(WWW)이 아니면 여기서 찾고, 없으면 자기
 * `/notifications`로 연다.
 *
 * - `Cache-Control: no-cache` — 브라우저는 24시간마다 워커 스크립트를 다시 받는데, CDN이 옛
 *   스크립트를 들고 있으면 새 배포 뒤에도 옛 캐시 이름으로 돈다. `force-dynamic`이 같은 이유.
 * - `Service-Worker-Allowed: /` — 스코프가 `/`이고 스크립트도 `/sw.js`라 없어도 되지만, 스크립트를
 *   옮기게 되면 이 헤더가 없어서 스코프가 좁아지는 종류의 실패라 처음부터 둔다.
 * - 미들웨어 매처(`/me/*`·`/notifications`·신청·공개 폼)가 좁아 이 경로는 원래 잡히지 않는다 — 넓힐 때
 *   `/sw.js`·`/offline`은 빼야 한다(워커 스크립트는 리다이렉트를 못 따라간다).
 */
export const dynamic = "force-dynamic";

// 알림 아이콘도 dev·prod로 갈린다 — 값은 이 파일이 읽어 넘긴다(인라인 함정은 layout.tsx 주석)
const DEPLOY = deployMarks(process.env.NEXT_PUBLIC_DEPLOY_ENV);

function apiOrigin(): string | null {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

export function GET() {
  const source = buildServiceWorker({
    cacheVersion: process.env.NEXT_PUBLIC_GIT_SHA ?? "unknown",
    offlinePath: "/offline",
    apiOrigin: apiOrigin(),
    appOrigins: appOrigins(),
    app: "WWW",
    iconPath: DEPLOY.mark,
  });
  return new NextResponse(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/",
    },
  });
}
