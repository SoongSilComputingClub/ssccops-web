"use client";

import { NotificationSettingsCard } from "@ssccops/pwa/ui";
import type { PushSubscriptionState } from "@ssccops/pwa";
import { notificationApi } from "@/entities/notification";
import { pushApi } from "@/entities/push";

/**
 * «알림 설정» 카드 — `/me` 허브 발치와 `/notifications` 맨 위 (#616 · #634 · ssccops#461).
 *
 * 카드(스위치·상태 문구·«테스트 알림 보내기»)는 `@ssccops/pwa/ui`의 `NotificationSettingsCard` 한 벌이고
 * 이 파일은 www의 서버 호출(`entities/push` `pushApi` · `entities/notification` `notificationApi.sendTest` —
 * `browser-client`)과 `app: "WWW"`를 꽂는 것이 전부다. #634 전에는 `PushToggleCard`·`usePushToggle`이 여기
 * 사본으로 있었다. 허브(SSR)에서는 발치의 유일한 클라이언트 구역이다 — 스위치는 «이 기기의 설정»이라
 * 서버가 그릴 수 없다(브라우저 권한·구독).
 */
export function NotificationSettings({
  onStateChange,
}: Readonly<{ onStateChange?: (state: PushSubscriptionState) => void }>) {
  return (
    <NotificationSettingsCard
      app="WWW"
      getConfig={pushApi.config}
      subscribe={pushApi.subscribe}
      unsubscribe={pushApi.unsubscribe}
      sendTest={notificationApi.sendTest}
      onStateChange={onStateChange}
    />
  );
}
