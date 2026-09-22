"use client";

import { NotificationSettingsCard } from "@ssccops/pwa/ui";
import type { PushSubscriptionState } from "@ssccops/pwa";
import { notificationApi } from "@/entities/notification";
import { pushApi } from "@/entities/push";

/**
 * «알림 설정» 카드 — `/my`와 `/notifications` 맨 위 (#604 · #634 · ssccops#461).
 *
 * 카드(스위치·상태 문구·«테스트 알림 보내기»)는 `@ssccops/pwa/ui`의 `NotificationSettingsCard` 한 벌이고
 * 이 파일은 admin의 서버 호출(`entities/push` `pushApi` · `entities/notification` `notificationApi.sendTest`)과
 * `app: "ADMIN"`을 꽂는 것이 전부다. #634 전에는 `PushToggleCard`·`usePushToggle`이 여기 사본으로 있었다.
 */
export function NotificationSettings({
  onStateChange,
}: Readonly<{ onStateChange?: (state: PushSubscriptionState) => void }>) {
  return (
    <NotificationSettingsCard
      app="ADMIN"
      getConfig={pushApi.config}
      subscribe={pushApi.subscribe}
      unsubscribe={pushApi.unsubscribe}
      sendTest={notificationApi.sendTest}
      onStateChange={onStateChange}
    />
  );
}
