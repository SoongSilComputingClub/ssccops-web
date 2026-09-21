# packages/pwa — `@ssccops/pwa`

**이 파일이 정본이고 루트 `AGENTS.md`는 링크만 든다**(ssccops#349). «왜 그 모양인가»는 `src/index.ts`·`src/service-worker.ts` 머리 주석에도 있다.

세 앱이 함께 쓰는 서비스워커·설치·푸시·오프라인(ADR-0045 · ssccops#447). 1차 PWA(#108)는 manifest·아이콘까지였고, 2차가 서비스워커와 표준 Web Push(VAPID)를 얹는다. 소스를 그대로 export 한다(빌드 단계 없음 — 앱 `next.config.ts`의 `transpilePackages`에 올린다).

| 내보내는 것 | 무엇 |
|---|---|
| `buildServiceWorker({ cacheVersion, offlinePath, apiOrigin, appOrigins, app, iconPath? })` | 서비스워커 소스 **문자열**. 앱의 `app/sw.js/route.ts`가 `Content-Type: application/javascript` · `Cache-Control: no-cache` · `Service-Worker-Allowed: /`로 내준다 |
| `registerServiceWorker()` · `SERVICE_WORKER_PATH` | 브라우저에서 한 번 등록. **개발 모드(`NODE_ENV !== "production"`)와 미지원 브라우저는 건너뛴다** |
| `clearServiceWorkerCache()` | 워커에 `{type: "CLEAR_CACHE"}` — 로그아웃 때 부른다 |
| `usePushSubscription({ app, getConfig, subscribe, unsubscribe })` | `state: unsupported · denied · off · on · pending` · `enable()` · `disable()` · `error` |
| `useInstallPrompt()` | `canInstall` · `install()` · `isIos` · `isStandalone` |
| `useOnline()` | `navigator.onLine` + `online`/`offline` 이벤트 |
| `NotificationItem` · `NotificationPage` · `PushSubscriptionRequest` · `PushApp` | 서버 계약 타입(ssccops#446 표 그대로) |
| `useUnreadCount()` · `setUnreadCount(n)` · `decrementUnreadCount()` | 종 배지 값 — 모듈 스토어(`useSyncExternalStore`, zustand 없음). 듣는 것은 앱 훅(#606) |
| `pushStateDescription(state, { isIos, isStandalone })` | 푸시 스위치 아래 상태 문장 — 미지원·차단·꺼짐·켜짐·확인 중 + iOS 미설치 힌트(#606) |
| `@ssccops/pwa/ui` → `NotificationList` · `NOTIFICATION_TYPE_LABEL` | 알림 목록(커서 «더 보기» · 읽음/안 읽음 · «모두 읽음») — admin·lms가 같은 것을 그린다. 데이터는 앱 훅이 넘긴다 |
| `@ssccops/pwa/ui` → `OfflineBanner` · `ServiceWorkerRegister` | 오프라인 띠(«오프라인 — 마지막으로 본 내용» · `useOnline`) · 등록 껍데기(루트 레이아웃에 한 번) — #606에서 올렸다 |

## 서비스워커가 하는 것 — 규칙 넷

| 요청 | 규칙 | 왜 |
|---|---|---|
| 같은 오리진 `GET /_next/static/*` | **캐시 우선** | 내용 해시가 주소에 있어 바뀌지 않는다 |
| 화면 이동(`mode: navigate`) | **네트워크 우선** → 캐시 → `offlinePath` | 최신 화면이 먼저, 끊기면 마지막으로 본 화면, 그것도 없으면 안내 |
| `apiOrigin`의 `GET` | **네트워크 우선** → 캐시(`ignoreVary`) | 오프라인에서 마지막으로 본 목록·상세가 그려진다. 토큰 갱신으로 `Authorization`이 달라져도 같은 사람의 같은 주소다 |
| 그 밖의 전부 | 손대지 않는다 | Supabase·CDN 폰트·`/version`·`/sw.js` — 브라우저 HTTP 캐시가 알아서 한다 |

- **캐시 이름은 `ssccops-pwa-<cacheVersion>` 하나.** activate가 다른 버전의 캐시를 지운다 — 옛 빌드의 조각이 새 HTML과 섞이지 않게. 앱은 `NEXT_PUBLIC_GIT_SHA`를 넘긴다.
- **200만 담는다.** 401·403·404·5xx와 리다이렉트(`opaqueredirect`, status 0)는 담지 않는다 — 담으면 연결이 돌아온 뒤에도 옛 오류가 그대로 뜨고, 리다이렉트 응답을 캐시에서 꺼내 주면 브라우저가 보안 오류로 죽는다.
- **`GET`이 아닌 요청은 손대지 않는다.** 오프라인 쓰기 큐·Background Sync는 만들지 않는다(ADR-0045 E안) — 승인·전이는 «누가 먼저 눌렀나»가 뜻을 가져 재생하면 결과가 달라진다. 오프라인에서 누르면 그냥 실패 토스트다.
- **`push`** → 페이로드 `{notificationId, type, title, body, app, linkPath}`를 `showNotification(title, {body, tag: "noti-"+id, data})`. **`notificationclick`** → `app`이 자기 앱이면 자기 오리진 + `linkPath`, 아니면 `appOrigins[app]` + `linkPath`, 그것도 없으면 자기 `/notifications`. 이미 열린 탭이 있으면 focus(같은 오리진이면 그 탭을 그 주소로), 없으면 `openWindow`. **절대 주소는 워커가 만든다** — 서버는 앱 오리진을 모른다(env를 늘리지 않는다).
- **`message {type: "CLEAR_CACHE"}`** → 캐시 전부 삭제. 로그아웃이 보낸다 — 남의 기기에 내 목록이 남지 않게.

## 왜 Workbox·next-pwa가 아닌가

규칙이 넷뿐이라 손으로 쓰는 편이 짧다. 빌드 플러그인은 `public/sw.js`를 생성하는데 그 단계가 Vercel(prod)과 OpenNext/Cloudflare(dev) 양쪽에서 같게 도는지 검증해야 하고(ADR-0030 플랫폼 중립), 캐시 이름에 sha를 넣으려면 그 파일을 또 써야 한다. 라우트 핸들러가 문자열을 내주면 두 플랫폼에서 이미 같은 뜻이고 복사 단계가 없다. 대가는 **문자열 안의 코드가 린트·타입 검사를 받지 않는다**는 것 — 그래서 짧게 두고 브라우저 표준 API만 쓴다.

## 앱이 할 일

1. `next.config.ts` `transpilePackages`에 `@ssccops/pwa`, `globals.css`에 `@source "../../../../packages/pwa/src"`(`NotificationList`의 토큰 클래스 — 루트 AGENTS.md «함정»).
2. `app/sw.js/route.ts` — `buildServiceWorker(...)`를 `application/javascript`로. `app/offline/page.tsx` — 정적, 데이터 없음. **둘 다 미들웨어 매처에서 뺀다** — 로그인 전에 `/sw.js`가 `/login`으로 리다이렉트되면 등록 자체가 실패하고(워커 스크립트는 리다이렉트를 못 따라간다), install이 `/offline`을 담을 때 로그인 HTML을 담는다.
3. 루트 레이아웃에 `@ssccops/pwa/ui`의 `ServiceWorkerRegister`(등록 한 번)와 `OfflineBanner`(띠). admin(#604)은 자기 `features/pwa`에 같은 두 컴포넌트를 사본으로 갖고 있다 — lms(#606)가 같은 것을 쓰게 되어 패키지로 올렸고, admin 사본(그리고 zustand `useUnreadStore`·`usePushToggle`의 `DESCRIPTION` 표)은 다음 admin 작업에서 패키지 것으로 바꾼다.
4. `usePushSubscription`에 앱의 `apiFetch`로 만든 `pushApi`를 넘긴다. 로그아웃 성공 뒤 `clearServiceWorkerCache()`.
5. `DELETE /v1/push/subscriptions`가 404(모르는 endpoint)면 앱 쪽에서 성공으로 삼킨다 — 브라우저 구독은 풀어야 한다.

## 함정

- **`serviceWorker.ready`는 등록이 없으면 영원히 기다린다.** 개발 모드가 그렇다 — 훅은 `getRegistration()`을 먼저 보고 없으면 `unsupported`다. 그래서 `next dev`에서는 푸시 토글이 «이 브라우저는 푸시 알림을 지원하지 않습니다»로 보인다. 확인은 dev 배포에서.
- **iOS는 홈 화면에 추가한 뒤에만 푸시가 된다**(16.4+). 설치 전 Safari에서는 `PushManager`가 없어 `unsupported`이고, 화면이 «홈 화면에 추가한 뒤 켤 수 있습니다» 한 줄을 덧붙인다. iOS는 `beforeinstallprompt`도 없어 «공유 → 홈 화면에 추가» 안내뿐이다.
- **VAPID 키를 바꾸면 전 구독이 무효다.** 서버 env(`SSCCOPS_PUSH_VAPID_*`)를 순환하면 운영진이 토글을 껐다 켜야 한다 — 공지에 넣을 사항.
- **`beforeinstallprompt`는 로드 직후 한 번만 온다.** 훅이 항상 마운트된 셸(`MobileNav`)에 있어야 잡힌다.
