# packages/pwa — `@ssccops/pwa`

**이 파일이 정본이고 루트 `AGENTS.md`는 링크만 든다**(ssccops#349). «왜 그 모양인가»는 `src/index.ts`·`src/service-worker.ts` 머리 주석에도 있다.

세 앱이 함께 쓰는 서비스워커·설치·푸시·오프라인(ADR-0045 · ssccops#447). 1차 PWA(#108)는 manifest·아이콘까지였고, 2차가 서비스워커와 표준 Web Push(VAPID)를 얹는다. admin #604 · lms #606 · www #616(ssccops#453 — 회원이 낸 응답의 결과·참가 상태를 받는다)이 차례로 붙었다. 소스를 그대로 export 한다(빌드 단계 없음 — 앱 `next.config.ts`의 `transpilePackages`에 올린다).

| 내보내는 것 | 무엇 |
|---|---|
| `buildServiceWorker({ cacheVersion, offlinePath, apiOrigin, appOrigins, app, iconPath? })` | 서비스워커 소스 **문자열**. 앱의 `app/sw.js/route.ts`가 `Content-Type: application/javascript` · `Cache-Control: no-cache` · `Service-Worker-Allowed: /`로 내준다 |
| `registerServiceWorker()` · `SERVICE_WORKER_PATH` | 브라우저에서 한 번 등록. **개발 모드(`NODE_ENV !== "production"`)와 미지원 브라우저는 건너뛴다** |
| `clearServiceWorkerCache()` | 워커에 `{type: "CLEAR_CACHE"}` — 로그아웃 때 부른다 |
| `usePushSubscription({ app, getConfig, subscribe, unsubscribe })` | `state: unsupported · denied · off · on · pending` · `enable()` · `disable()` · `error` |
| `useInstallPrompt()` | `canInstall` · `install()` · `isIos` · `isStandalone` |
| `useOnline()` | `navigator.onLine` + `online`/`offline` 이벤트 |
| `NotificationItem` · `NotificationPage` · `NotificationType` · `PushSubscriptionRequest` · `PushTestRequest`·`PushTestResult` · `PushApp` | 서버 계약 타입(ssccops#446 표 그대로). `NotificationType`은 5(운영진 · 승인·마감) + 6(회원 · ssccops#453 — `RESPONSE_ACCEPTED`·`RESPONSE_REJECTED`·`RESPONSE_CHANGES_REQUESTED`·`APPLICATION_CONFIRMED`·`APPLICATION_WAITLISTED`·`APPLICATION_CANCELLED`, `app = WWW`) + `TEST`(ssccops#454) |
| `useUnreadCount()` · `setUnreadCount(n)` · `decrementUnreadCount()` | 종 배지 값 — 모듈 스토어(`useSyncExternalStore`, zustand 없음). 듣는 것은 앱 훅(#606) |
| `createNotificationApi(apiFetch)` · `useNotificationList({ api, app, resolveTarget, push, toErrorMessage, classifyStatus?, setUnread?, decrementUnread?, onActionError? })` | 알림 호출 한 벌(`GET /v1/notifications` 커서 목록 · `unread-count` · `/{id}/read` · `/read-all` · `/test`)과 `/notifications` 화면 상태(목록 · «더 보기» · 읽음 처리 · 배지 · 범위 칩) — 세 앱에 한 벌씩 있던 사본을 #665에서 올렸다. 계약(ssccops#446 · ADR-0047)이 정하는 것은 여기 있고 **갈리는 것만 주입한다**: 보내는 `apiFetch`, `CURRENT_APP`, 행을 눌렀을 때 갈 곳과 라우터 이동, 401·403을 화면 상태로 올릴지(`classifyStatus` — www·lms만), 배지 스토어와 «모두 읽음» 실패의 자리(기본은 이 패키지의 모듈 스토어와 `actionError` 한 줄 · admin이 zustand 스토어와 토스트를 꽂는다). **넘기는 함수는 렌더마다 같은 것이어야 한다**(모듈 함수 · zustand 셀렉터 · `useCallback`) — 효과·콜백의 의존성에 그대로 들어간다 |
| `pushStateDescription(state, { isIos, isStandalone })` | 푸시 스위치 아래 상태 문장 — 미지원·차단·꺼짐·켜짐·확인 중 + iOS 미설치 힌트(#606). 세 앱이 같은 글자(#616에서 admin 표도 이것으로). 무엇이 오는지는 나열하지 않는다 — 운영진과 회원이 받는 종류가 달라 한 줄에 다 적으면 남의 것이 섞인다 |
| `@ssccops/pwa/ui` → `NotificationList` · `NOTIFICATION_TYPE_LABEL` · `NOTIFICATION_APP_LABEL` · `NotificationScope` | 알림 목록(커서 «더 보기» · 읽음/안 읽음 · «모두 읽음») — admin·lms·www가 같은 것을 그린다. 데이터는 앱 훅이 넘긴다. 라벨 표는 12종 전부(#616). 빈 상태에 `onOpenSettings`를 넘기면 «푸시를 켜면 새 알림이 이 기기로 옵니다» + «설정 열기»가 붙는다(#634). **머리에 «이 앱 \| 전체» 칩**(#643 · ADR-0047 — `scope`·`onScopeChange`, 기본 «이 앱», 값은 앱 훅의 상태이고 주소·localStorage에 남지 않는다)이 서고, 행의 `app`이 `currentApp`과 다르면 꼬리표 «운영 ↗»·«학술 ↗»·«홈페이지 ↗»(`NOTIFICATION_APP_LABEL`)가 붙는다 — **갈 수 있는지와 무관하다**(그 앱 오리진이 없으면 눌러도 머물지만 «어디 것인가»는 사실이다). 칩은 로딩·오류·빈 상태에서도 그대로 보인다 |
| `@ssccops/pwa/ui` → `NotificationSettingsCard({ app, getConfig, subscribe, unsubscribe, sendTest, onStateChange? })` | «알림 설정» 카드 한 벌(ssccops#461 · #634) — «푸시 알림» 스위치(`@ssccops/ui` `Toggle`) + 상태 문구(`pushStateDescription`) + 켜졌을 때 `PushTestButton`. 상태 기계(`usePushSubscription`)는 카드 안에 있고 앱은 서버 호출 넷과 `app`만 꽂는다 — admin `/my`·lms `/my`·www `/me`가 `features/pwa` `NotificationSettings`(배선만)로 그리고, 세 앱 `/notifications` 맨 위에도 같은 카드가 있다. #634 전 세 앱의 `PushToggleCard`·`usePushToggle` 사본은 지웠다 |
| `@ssccops/pwa/ui` → `useNotificationSettingsDisclosure()` · `NotificationSettingsButton({ open, onClick })` · `NOTIFICATION_SETTINGS_SECTION_ID` | `/notifications`의 «알림 설정» 절을 펼칠지 — **스위치가 `off`·`denied`·`unsupported`면 펼친 채, `on`이면 접힌 채로 시작**(localStorage 없음 — 상태가 규칙). 처음 정해진 뒤에는 사람이 ⚙ «설정»(`aria-expanded`·`aria-controls`)으로 누른 대로만 바뀐다 — 절 안에서 켰다고 스스로 접히지 않는다. 카드는 접혀 있어도 `hidden`으로 마운트돼 있어야 한다(상태를 카드가 안다). `pushOn`은 빈 상태의 «푸시를 켜면…» 한 줄을 켜진 사람에게 감추는 데 쓴다 |
| `@ssccops/pwa/ui` → `PushTestButton({ app, sendTest, enabled })` | «테스트 알림 보내기»(ssccops#454 · #616) — `NotificationSettingsCard` 안, `enabled`(스위치 켜짐)일 때만 그린다. 앱이 `sendTest`(`POST /v1/notifications/test {app}` → `{notificationId, pushed}`)를 넘기고 버튼이 문구를 가른다: 성공 «보냈습니다 — 기기 알림을 확인해주세요(n대)», `pushed === 0`(서버가 푸시를 껐거나 구독이 죽음)이면 «푸시 알림을 껐다 켜주세요», 429(`status` 429 또는 `code === "RATE_LIMITED"` · server#529 — 1분 3회)면 «너무 자주 보냈습니다», 그 밖은 «보내지 못했습니다». 앱의 `ApiError`를 모르므로 `status`·`code` 필드만 duck-typing |
| `@ssccops/pwa/ui` → `OfflineBanner` · `ServiceWorkerRegister` | 오프라인 띠(«오프라인 — 마지막으로 본 내용» · `useOnline`) · 등록 껍데기(루트 레이아웃에 한 번) — #606에서 올렸다 |
| `@ssccops/pwa/ui` → `InstallMenuItem` | 계정 메뉴 절 ⑤ «홈 화면에 추가»(`useInstallPrompt` + `@ssccops/ui` `AccountMenuItem`/`AccountMenuNote`) — 설치 가능하면 항목, iOS는 안내 한 줄, 설치된 창은 없음. admin·lms의 `InstallItem` 사본을 #614(ssccops#452)에서 올렸고 www도 같은 것을 쓴다. 이 패키지가 `@ssccops/ui`에 기대는 유일한 자리 |

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
3. 루트 레이아웃에 `@ssccops/pwa/ui`의 `ServiceWorkerRegister`(등록 한 번)와 `OfflineBanner`(띠). admin(#604)은 자기 `features/pwa`에 같은 두 컴포넌트를 사본으로 갖고 있다 — lms(#606)가 같은 것을 쓰게 되어 패키지로 올렸고, admin 사본(그리고 zustand `useUnreadStore`)은 다음 admin 작업에서 패키지 것으로 바꾼다(`usePushToggle`의 `DESCRIPTION` 표는 #616에서 `pushStateDescription`으로 바꿨다).
4. `features/pwa` `NotificationSettings`(배선만) → `NotificationSettingsCard`에 앱의 `apiFetch`로 만든 `pushApi` 셋과 `notificationApi.sendTest`를 넘긴다 — admin `/my` · lms `/my` · www `/me`(#616)와 세 앱 `/notifications` 맨 위(#634 — `useNotificationSettingsDisclosure` + 헤더의 `NotificationSettingsButton` + `hidden` 절). 로그아웃 성공 뒤 `clearServiceWorkerCache()`.
5. `DELETE /v1/push/subscriptions`가 404(모르는 endpoint)면 앱 쪽에서 성공으로 삼킨다 — 브라우저 구독은 풀어야 한다.
6. `entities/notification`은 `createNotificationApi(앱의 apiFetch)`와 **`CURRENT_APP`**(이 앱의 `PushApp`)만 두고, 목록·안 읽은 수 조회에 그 값을 `app`으로 싣는다(#643 · ADR-0047 · server#535). `/notifications` 화면 상태는 `useNotificationList`에 그 둘과 이동 규칙을 꽂아 받는다(#665 — 아래 규칙은 그 훅이 지킨다). **종 배지는 언제나 «이 앱» 수다** — «전체» 칩에서는 `app`을 빼고 목록을 부르되 그 응답의 `unreadCount`는 스토어에 넣지 않고, 그 범위에서 한 건을 읽으면 하나 빼는 대신 `app=<이 앱>`으로 다시 묻는다(읽은 행이 이 앱에도 오는 알림인지는 기준표가 안다). 범위를 바꾸면 커서가 앞 범위의 것이라 목록을 처음부터 다시 부른다.

## 함정

- **`serviceWorker.ready`는 등록이 없으면 영원히 기다린다.** 개발 모드가 그렇다 — 훅은 `getRegistration()`을 먼저 보고 없으면 `unsupported`다. 그래서 `next dev`에서는 푸시 토글이 «이 브라우저는 푸시 알림을 지원하지 않습니다»로 보인다. 확인은 dev 배포에서.
- **iOS는 홈 화면에 추가한 뒤에만 푸시가 된다**(16.4+). 설치 전 Safari에서는 `PushManager`가 없어 `unsupported`이고, 화면이 «홈 화면에 추가한 뒤 켤 수 있습니다» 한 줄을 덧붙인다. iOS는 `beforeinstallprompt`도 없어 «공유 → 홈 화면에 추가» 안내뿐이다.
- **VAPID 키를 바꾸면 전 구독이 무효다.** 서버 env(`SSCCOPS_PUSH_VAPID_*`)를 순환하면 운영진이 토글을 껐다 켜야 한다 — 공지에 넣을 사항.
- **`beforeinstallprompt`는 로드 직후 한 번만 온다.** 훅이 항상 마운트된 셸(`MobileNav`)에 있어야 잡힌다.
