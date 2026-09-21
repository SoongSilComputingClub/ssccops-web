import { NextResponse } from "next/server";
import { buildServiceWorker } from "@ssccops/pwa";
import { deployMarks } from "@ssccops/ui";
import { appOrigins } from "@/shared/config/site-links";

/*
 * `GET /sw.js` — 서비스워커 (#604 · ADR-0045).
 *
 * `public/sw.js` 파일이 아니라 라우트 핸들러가 `@ssccops/pwa`의 소스 문자열을 내준다 — 캐시 이름에
 * 빌드 sha(`NEXT_PUBLIC_GIT_SHA` · `next.config.ts`가 인라인)를 넣으려면 빌드마다 파일을 다시 써야
 * 하는데, 그 단계는 Vercel·OpenNext 양쪽에서 검증할 것이 하나 더 는다(플랫폼 중립 · ADR-0030).
 * 라우트 핸들러는 `/version`과 같은 자리라 이미 두 플랫폼에서 같은 뜻이다.
 *
 * - `Cache-Control: no-cache` — 브라우저는 24시간마다 워커 스크립트를 다시 받는데, CDN이 옛
 *   스크립트를 들고 있으면 새 배포 뒤에도 옛 캐시 이름으로 돈다. `force-dynamic`이 같은 이유.
 * - `Service-Worker-Allowed: /` — 스코프가 `/`이고 스크립트도 `/sw.js`라 없어도 되지만, 스크립트를
 *   옮기게 되면 이 헤더가 없어서 스코프가 좁아지는 종류의 실패라 처음부터 둔다.
 * - **미들웨어 매처에서 뺐다**(`middleware.ts`) — 워커 스크립트는 리다이렉트를 못 따라간다.
 *
 * `apiOrigin`은 `NEXT_PUBLIC_API_BASE_URL`의 오리진이다 — `apiFetch`와 같은 값을 읽으므로 새 env가
 * 없다. 값이 비면 API 응답은 캐시하지 않는다(요청도 어차피 나가지 않는다 · `CLIENT_CONFIG_MISSING`).
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
    app: "ADMIN",
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
