/*
 * @ssccops/pwa — 세 앱이 함께 쓰는 서비스워커·설치·푸시·오프라인 (ADR-0045 · ssccops#447).
 *
 * ── 여기 있는 것 ────────────────────────────────────────────
 * - `buildServiceWorker(config)`  서비스워커 소스 문자열 — 앱의 `app/sw.js/route.ts`가 내준다
 * - `registerServiceWorker()` · `clearServiceWorkerCache()`  등록(개발 모드 제외) · 로그아웃 때 비움
 * - `usePushSubscription(...)` · `useInstallPrompt()` · `useOnline()`  화면 훅
 * - `NotificationItem` 등 계약 타입 — 서버 표 그대로(ssccops#446)
 * - `useUnreadCount` · `setUnreadCount` · `decrementUnreadCount`  종 배지 값 (#606)
 * - `pushStateDescription(state, ctx)`  푸시 스위치 아래 문구 (#606)
 * - `@ssccops/pwa/ui`  알림 목록·«알림 설정» 카드(#634)·오프라인 띠·서비스워커 등록 껍데기 — 세 앱이 같은 것을 그린다
 *
 * ── 여기 없는 것 ────────────────────────────────────────────
 * 서버 호출(`apiFetch`)과 이동 규칙. 앱마다 인증 헤더·401 처리·라우트가 달라 훅이 콜백으로 받는다.
 * `process.env.NEXT_PUBLIC_*`도 읽지 않는다 — 앱 파일에 글자 그대로 적혀야 빌드 때 인라인된다
 * (`@ssccops/ui`와 같은 규칙). 예외는 `NODE_ENV` 하나(`register.ts` 주석).
 *
 * 왜 이 모양인지(캐시 규칙·Workbox를 안 쓴 이유)는 `README.md`.
 */

export {
  buildServiceWorker,
  type PushApp,
  type ServiceWorkerConfig,
} from "./service-worker";
export {
  SERVICE_WORKER_PATH,
  clearServiceWorkerCache,
  registerServiceWorker,
} from "./register";
export type {
  NotificationItem,
  NotificationPage,
  NotificationType,
  PushSubscriptionRequest,
  PushTestRequest,
  PushTestResult,
} from "./notification";
export {
  usePushSubscription,
  type PushSubscriptionControls,
  type PushSubscriptionState,
  type UsePushSubscriptionOptions,
} from "./use-push-subscription";
export { useInstallPrompt, type InstallPromptControls } from "./use-install-prompt";
export { useOnline } from "./use-online";
export { decrementUnreadCount, setUnreadCount, useUnreadCount } from "./unread-store";
export { pushStateDescription } from "./push-copy";
