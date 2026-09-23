import type { NotificationTarget } from "@ssccops/pwa";
import type { NotificationItem } from "@/entities/notification";
import { appOrigins } from "@/shared/config/app-origins";

export type { NotificationTarget };

/**
 * 알림 행 → 갈 곳 (#616 · admin #604·lms #606과 같은 규칙). 서비스워커의 `notificationclick`과도 같다 —
 * 자기 앱(WWW)이면 라우터 이동(`/me/responses`·`/me/proposals`·`/me/applications` · 테스트 알림은 `/me`),
 * ADMIN·LMS면 그 앱의 오리진(`app-origins.ts`)으로 전체 이동, 오리진이 없으면 머문다(행은 글자만 —
 * 읽음 처리는 된다). 운영진이 www에서 어드민 알림(승인 요청)을 받는 경우가 이 «외부 링크»다 — 알림은
 * 회원 단위라 어느 앱에서 구독하든 같은 것이 온다(ssccops#448).
 */
export function notificationTarget(item: NotificationItem): NotificationTarget {
  const path = item.linkPath || "";
  if (item.app === "WWW") return path ? { kind: "internal", href: path } : { kind: "none" };
  const origin = item.app === "ADMIN" || item.app === "LMS" ? appOrigins()[item.app] : undefined;
  if (!origin) return { kind: "none" };
  return { kind: "external", href: `${origin}${path}` };
}
