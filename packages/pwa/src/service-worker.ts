/*
 * 서비스워커 소스 (ADR-0045 · ssccops#447).
 *
 * ── 왜 파일이 아니라 문자열인가 ─────────────────────────────
 * `public/sw.js`로 두면 앱마다 사본이 생기고, 캐시 이름에 빌드 sha를 넣으려면 빌드 단계에서
 * 파일을 다시 써야 한다. 그 단계는 Vercel과 OpenNext(Cloudflare) 양쪽에서 검증해야 하는데
 * (ADR-0030 플랫폼 중립) 검증할 것이 하나 늘 뿐 얻는 것이 없다. 대신 각 앱의
 * `app/sw.js/route.ts`가 이 함수의 결과를 `application/javascript`로 내준다 — 라우트 핸들러는
 * 두 플랫폼에서 이미 같은 뜻이고, 앱은 자기 값(빌드 sha·API 오리진·다른 앱 오리진)만 넘긴다.
 *
 * ── 왜 Workbox·next-pwa가 아닌가 ─────────────────────────
 * 규칙이 넷뿐이다 — 정적 자산 캐시 우선 · 화면 이동 네트워크 우선 + `/offline` · API GET
 * 네트워크 우선 + 캐시 폴백 · 로그아웃 시 비움. 손으로 쓰는 편이 짧고, 빌드 플러그인이 두
 * 플랫폼에서 어떻게 도는지 검증하지 않아도 된다(ssccops#447 «판단과 기각한 대안»).
 *
 * ── 캐시하지 않는 것 ────────────────────────────────────────
 * - GET이 아닌 요청. 오프라인에서 누른 승인·전이를 나중에 재생하면 «누가 먼저 눌렀나»가 뜻을
 *   잃는다(ADR-0045 E안 — 쓰기 큐 없음).
 * - 200이 아닌 응답. 401·403·404·5xx를 캐시하면 연결이 돌아온 뒤에도 옛 오류가 그대로 뜬다.
 * - 리다이렉트 응답(화면 이동의 `opaqueredirect` — status 0). 브라우저가 따라가야 할 응답을
 *   캐시에서 꺼내 주면 보안 오류로 화면이 죽는다.
 * - API 오리진이 아닌 곳의 응답(Supabase·CDN 폰트). 그쪽은 브라우저 HTTP 캐시가 알아서 한다.
 *
 * ── 캐시 이름 ───────────────────────────────────────────────
 * `ssccops-pwa-<cacheVersion>` 하나다. 배포 sha가 바뀌면 activate에서 다른 버전의 캐시를 전부
 * 지우므로 옛 빌드의 `/_next/static` 조각이 새 HTML과 섞이지 않는다. 정적·화면·API를 나눠 두지
 * 않은 것은 셋을 다르게 비울 일이 없어서다 — 로그아웃은 전부 비운다.
 *
 * ── 이 문자열 안의 코드는 린트·타입 검사를 받지 않는다 ───────
 * 그래서 짧게 두고, 의존하는 것은 브라우저 표준 API뿐이다. 고칠 때는 dev 배포에서 DevTools
 * «Application › Service Workers»로 확인한다(개발 모드에서는 등록되지 않는다 — `register.ts`).
 */

export interface ServiceWorkerConfig {
  /**
   * 캐시 이름에 들어가는 빌드 식별자 — 앱은 `NEXT_PUBLIC_GIT_SHA`를 넘긴다. 값이 바뀌면 옛
   * 캐시가 전부 지워진다.
   */
  cacheVersion: string;
  /** install 때 미리 담아 두는 오프라인 안내 화면 경로 (`/offline`) */
  offlinePath: string;
  /**
   * `GET`만 네트워크 우선 + 캐시 폴백으로 다루는 API 오리진 — `NEXT_PUBLIC_API_BASE_URL`의
   * 오리진. 비면 API 응답은 아예 캐시하지 않는다.
   */
  apiOrigin: string | null;
  /**
   * 알림을 눌렀을 때 열 다른 앱의 오리진 — 푸시 페이로드의 `app`(ADMIN·LMS·WWW)이 자기 앱이
   * 아니면 여기서 찾는다. 없으면 자기 `/notifications`로 연다.
   */
  appOrigins: Partial<Record<PushApp, string>>;
  /** 이 서비스워커가 붙은 앱 — 페이로드의 `app`과 같으면 자기 오리진으로 연다 */
  app: PushApp;
  /** 알림 아이콘 경로 (`/icons/prod/icon-192.png`). 없으면 브라우저 기본 */
  iconPath?: string;
}

/** 푸시 구독·알림 행의 `app` — 서버 `app_cd`와 같은 값 (ssccops#446) */
export type PushApp = "ADMIN" | "LMS" | "WWW";

/**
 * 서비스워커 소스를 만든다. 앱의 `app/sw.js/route.ts`가 이 문자열을
 * `Content-Type: application/javascript`로 내준다.
 */
export function buildServiceWorker(config: ServiceWorkerConfig): string {
  const injected = {
    cacheName: `ssccops-pwa-${config.cacheVersion || "unknown"}`,
    cachePrefix: "ssccops-pwa-",
    offlinePath: config.offlinePath,
    apiOrigin: config.apiOrigin ?? "",
    appOrigins: config.appOrigins,
    app: config.app,
    iconPath: config.iconPath ?? "",
    notificationsPath: "/notifications",
  };
  return `/* ssccops 서비스워커 — @ssccops/pwa buildServiceWorker()가 만든다. 손으로 고치지 않는다 (ADR-0045) */
const CONFIG = ${JSON.stringify(injected)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CONFIG.cacheName)
      // 미들웨어 매처에서 뺀 정적 화면이라 로그인 전에도 담긴다. reload로 브라우저 HTTP 캐시를 건너뛴다
      .then((cache) => cache.add(new Request(CONFIG.offlinePath, { cache: "reload" })))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CONFIG.cachePrefix) && key !== CONFIG.cacheName)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** 200만 담는다 — 오류·리다이렉트(status 0)는 연결이 돌아온 뒤에도 옛 것이 뜨게 만든다 */
function cacheOk(request, response) {
  if (!response || response.status !== 200) return response;
  const copy = response.clone();
  caches
    .open(CONFIG.cacheName)
    .then((cache) => cache.put(request, copy))
    .catch(() => undefined);
  return response;
}

/** 정적 자산(/_next/static — 내용 해시가 주소에 있어 바뀌지 않는다) */
function cacheFirst(request) {
  return caches.match(request).then((hit) => hit || fetch(request).then((res) => cacheOk(request, res)));
}

/** 화면 이동 — 네트워크 → 캐시 → 오프라인 안내 */
function navigate(request) {
  return fetch(request)
    .then((res) => cacheOk(request, res))
    .catch(() =>
      caches
        .match(request)
        .then((hit) => hit || caches.match(CONFIG.offlinePath))
        .then((hit) => hit || Response.error()),
    );
}

/**
 * API GET — 네트워크 → 캐시. 토큰이 갱신되면 Authorization이 달라지고 서버가 Vary를 실을 수
 * 있어 ignoreVary로 맞춘다(같은 사람의 같은 주소다 — 로그아웃이 캐시를 비운다).
 */
function networkFirst(request) {
  return fetch(request)
    .then((res) => cacheOk(request, res))
    .catch(() => caches.match(request, { ignoreVary: true }).then((hit) => hit || Response.error()));
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // 쓰기는 손대지 않는다 — 큐도 재생도 없다 (ADR-0045)
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(navigate(request));
    return;
  }
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/_next/static/")) event.respondWith(cacheFirst(request));
    return;
  }
  if (CONFIG.apiOrigin && url.origin === CONFIG.apiOrigin) {
    event.respondWith(networkFirst(request));
  }
});

self.addEventListener("push", (event) => {
  let payload = null;
  try {
    payload = event.data ? event.data.json() : null;
  } catch {
    payload = null;
  }
  if (!payload || !payload.title) return;
  const options = {
    body: payload.body || "",
    // 같은 알림이 두 번 오면 하나로 겹친다
    tag: "noti-" + String(payload.notificationId || ""),
    data: payload,
  };
  if (CONFIG.iconPath) options.icon = CONFIG.iconPath;
  event.waitUntil(self.registration.showNotification(payload.title, options));
});

/** 페이로드의 app·linkPath → 절대 주소. 서버는 앱 오리진을 모른다 — 여기서 만든다 (ssccops#446) */
function targetUrl(payload) {
  const linkPath = payload && typeof payload.linkPath === "string" ? payload.linkPath : "";
  const app = payload ? payload.app : "";
  if (app === CONFIG.app) return self.location.origin + (linkPath || CONFIG.notificationsPath);
  const origin = CONFIG.appOrigins[app];
  if (origin) return origin + (linkPath || "");
  return self.location.origin + CONFIG.notificationsPath;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = targetUrl(event.notification.data);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const exact = list.find((c) => c.url === url);
      if (exact) return exact.focus();
      // 같은 앱의 탭이 열려 있으면 그 탭을 그 주소로 옮긴다 — 다른 오리진의 탭은 옮길 수 없다
      const same = list.find((c) => c.url.startsWith(self.location.origin) && "navigate" in c);
      if (same && url.startsWith(self.location.origin)) {
        return same.focus().then((c) => (c && c.navigate ? c.navigate(url) : c));
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "CLEAR_CACHE") return;
  // 로그아웃 — 남의 기기에 내 목록이 남지 않게 전부 비운다
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
});
`;
}
