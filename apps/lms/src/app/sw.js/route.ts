import { serviceWorkerResponse } from "@ssccops/pwa";
import { appOrigins } from "@/shared/config/site-links";

/*
 * `GET /sw.js` — 서비스워커 (#606 · ADR-0045 · #671).
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
 * - `force-dynamic` — CDN이 옛 스크립트를 들고 있으면 새 배포 뒤에도 옛 캐시 이름으로 돈다(응답 헤더의
 *   `Cache-Control: no-cache`가 같은 이유 · 패키지가 붙인다).
 * - **미들웨어 매처에서 뺐다**(`middleware.ts`) — 비밀이 없는 정적 응답에 Supabase 왕복을 붙이지 않는다.
 *
 * `apiBaseUrl`은 `apiFetch`와 같은 값을 읽는다 — 패키지가 오리진만 뽑는다. 값이 비면 API 응답은
 * 캐시하지 않는다(요청도 어차피 나가지 않는다 · `CLIENT_CONFIG_MISSING`). `appOrigins`는
 * `site-links.ts` — ADMIN은 이 앱의 새 env `NEXT_PUBLIC_ADMIN_ORIGIN`, WWW는 `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return serviceWorkerResponse({
    app: "LMS",
    appOrigins: appOrigins(),
    cacheVersion: process.env.NEXT_PUBLIC_GIT_SHA,
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    deployEnv: process.env.NEXT_PUBLIC_DEPLOY_ENV,
  });
}
