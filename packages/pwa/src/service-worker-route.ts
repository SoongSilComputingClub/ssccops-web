import { deployMarks } from "@ssccops/ui";
import { buildServiceWorker, type PushApp } from "./service-worker";

/*
 * `GET /sw.js`의 응답 — 앱의 `app/sw.js/route.ts`가 한 줄로 부른다 (#671 · ADR-0045).
 *
 * 세 앱의 라우트 핸들러가 32줄씩 같았다 — `apiOrigin()` 파싱 · `deployMarks(...).mark` · 헤더 셋.
 * 갈리는 것은 값 셋(`app`·`appOrigins`·오리진을 뽑을 `NEXT_PUBLIC_API_BASE_URL`)뿐이라 껍데기를 여기
 * 한 벌만 둔다. 워커 소스 자체는 `buildServiceWorker`가 만든다(`service-worker.ts` 머리 주석).
 *
 * **`process.env.NEXT_PUBLIC_*`은 여전히 앱 파일이 읽는다** — 이 패키지는 env를 읽지 않는다(`index.ts`
 * «여기 없는 것»). `NEXT_PUBLIC_*`은 빌드 때 글자 그대로 치환되므로 앱 파일에 적혀 있어야 값이 들어간다.
 *
 * - `Cache-Control: no-cache` — 브라우저는 24시간마다 워커 스크립트를 다시 받는데, CDN이 옛 스크립트를
 *   들고 있으면 새 배포 뒤에도 옛 캐시 이름으로 돈다. 앱의 `force-dynamic`이 같은 이유.
 * - `Service-Worker-Allowed: /` — 스코프가 `/`이고 스크립트도 `/sw.js`라 없어도 되지만, 스크립트를
 *   옮기게 되면 이 헤더가 없어서 스코프가 좁아지는 종류의 실패라 처음부터 둔다.
 * - `NextResponse`가 아니라 표준 `Response`다 — 라우트 핸들러는 둘을 같게 받고, 이 패키지가
 *   `next/server`(서버 전용)를 끌어오지 않는 편이 낫다.
 */
export interface ServiceWorkerRouteConfig {
  /** 이 워커가 붙은 앱 — 푸시 페이로드의 `app`이 같으면 자기 오리진으로 연다 */
  app: PushApp;
  /** 알림을 눌렀을 때 열 다른 앱의 오리진 — 앱의 `appOrigins()` */
  appOrigins: Partial<Record<PushApp, string>>;
  /** `process.env.NEXT_PUBLIC_GIT_SHA` — 비면 `unknown`(캐시 이름에 들어간다) */
  cacheVersion?: string;
  /** `process.env.NEXT_PUBLIC_API_BASE_URL` — 여기서 오리진만 뽑는다. 비면 API 응답은 캐시하지 않는다 */
  apiBaseUrl?: string;
  /** `process.env.NEXT_PUBLIC_DEPLOY_ENV` — 알림 아이콘도 dev·prod로 갈린다 */
  deployEnv?: string;
  /** install 때 미리 담는 안내 화면. 세 앱 모두 `/offline`이다 */
  offlinePath?: string;
}

/** `NEXT_PUBLIC_API_BASE_URL` → 오리진. 비었거나 주소가 아니면 null(캐시하지 않는다) */
function toOrigin(base: string | undefined): string | null {
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

export function serviceWorkerResponse({
  app,
  appOrigins,
  cacheVersion,
  apiBaseUrl,
  deployEnv,
  offlinePath = "/offline",
}: ServiceWorkerRouteConfig): Response {
  const source = buildServiceWorker({
    cacheVersion: cacheVersion ?? "unknown",
    offlinePath,
    apiOrigin: toOrigin(apiBaseUrl),
    appOrigins,
    app,
    iconPath: deployMarks(deployEnv).mark,
  });
  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/",
    },
  });
}
