import { serviceWorkerResponse } from "@ssccops/pwa";
import { appOrigins } from "@/shared/config/app-origins";

/*
 * `GET /sw.js` — 서비스워커 (#607 · #616 · ssccops#449 · ssccops#453 · ADR-0045 · #671).
 *
 * `public/sw.js` 파일이 아니라 라우트 핸들러가 `@ssccops/pwa`의 소스 문자열을 내준다 — 캐시 이름에
 * 빌드 sha(`NEXT_PUBLIC_GIT_SHA` · `next.config.ts`가 인라인)를 넣으려면 빌드마다 파일을 다시 써야
 * 하는데, 그 단계는 Vercel·OpenNext 양쪽에서 검증할 것이 하나 더 는다(플랫폼 중립 · ADR-0030).
 * 라우트 핸들러는 `/version`과 같은 자리라 이미 두 플랫폼에서 같은 뜻이다.
 *
 * 헤더 셋(`application/javascript` · `no-cache` · `Service-Worker-Allowed: /`)과 `apiOrigin` 파싱·
 * 알림 아이콘은 세 앱이 같아 `serviceWorkerResponse`로 올렸다(#671) — 이 파일에 남은 것은 **env를
 * 글자 그대로 읽는 일**(`NEXT_PUBLIC_*`은 빌드 때 치환된다)과 이 앱의 값 둘이다.
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
 * - `force-dynamic` — CDN이 옛 스크립트를 들고 있으면 새 배포 뒤에도 옛 캐시 이름으로 돈다(응답 헤더의
 *   `Cache-Control: no-cache`가 같은 이유 · 패키지가 붙인다).
 * - 미들웨어 매처(`/me/*`·`/notifications`·신청·공개 폼)가 좁아 이 경로는 원래 잡히지 않는다 — 넓힐 때
 *   `/sw.js`·`/offline`은 빼야 한다(워커 스크립트는 리다이렉트를 못 따라간다).
 */
export const dynamic = "force-dynamic";

export function GET() {
  return serviceWorkerResponse({
    app: "WWW",
    appOrigins: appOrigins(),
    cacheVersion: process.env.NEXT_PUBLIC_GIT_SHA,
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    deployEnv: process.env.NEXT_PUBLIC_DEPLOY_ENV,
  });
}
