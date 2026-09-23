"use client";

import { NotificationBell as PwaNotificationBell } from "@ssccops/pwa/ui";
import { ROUTES } from "@/shared/config/routes";

/**
 * 종 — 안 읽은 알림 수 배지 + `/notifications` 링크 (#606 · ssccops#448 · #671).
 *
 * 모양도 배지 규칙도 www와 같아 `@ssccops/pwa/ui`로 올렸다 — 여기는 이 앱의 경로를 꽂는 것이 전부다.
 * 자리는 상단 바의 드로어 버튼(☰) 옆이고 크기·테두리가 그것과 같다.
 */
export function NotificationBell() {
  return <PwaNotificationBell href={ROUTES.notifications} />;
}
