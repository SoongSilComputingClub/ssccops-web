"use client";

import { NotificationBell as PwaNotificationBell } from "@ssccops/pwa/ui";
import { ROUTES } from "@/shared/config/routes";

/**
 * 종 — 안 읽은 알림 수 배지 + `/notifications` 링크 (#616 · ssccops#453 · #671).
 *
 * 모양도 배지 규칙도 lms와 같아 `@ssccops/pwa/ui`로 올렸다 — 여기는 이 앱의 경로를 꽂는 것이 전부다.
 * 자리는 `UtilityCluster`의 `bell` 슬롯(#614) — 로그인한 사람에게만 있고, 상단 바 하나가 데스크톱·
 * 모바일을 함께 맡는다.
 */
export function NotificationBell() {
  return <PwaNotificationBell href={ROUTES.notifications} />;
}
