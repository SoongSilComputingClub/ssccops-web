import type { NotificationItem } from "@/entities/notification";
import { appOrigins } from "@/shared/config/site-links";

export type NotificationTarget =
  | { kind: "internal"; href: string }
  | { kind: "external"; href: string }
  | { kind: "none" };

/**
 * 알림 행 → 갈 곳 (#604). 서비스워커의 `notificationclick`과 같은 규칙이다 — 자기 앱이면 라우터
 * 이동, 다른 앱이면 그 앱의 오리진(`site-links`)으로 전체 이동, 오리진이 없으면 머문다.
 */
export function notificationTarget(item: NotificationItem): NotificationTarget {
  const path = item.linkPath || "";
  if (item.app === "ADMIN") return path ? { kind: "internal", href: path } : { kind: "none" };
  const origin = item.app === "LMS" || item.app === "WWW" ? appOrigins()[item.app] : undefined;
  if (!origin) return { kind: "none" };
  return { kind: "external", href: `${origin}${path}` };
}
