import type { PushApp } from "./service-worker";

/*
 * 알림·푸시 구독의 계약 타입 — 서버 표 그대로 (ssccops#446 «API 계약»).
 *
 * 앱의 `entities/*`가 응답 타입을 따로 갖지 않고 이것을 쓴다 — admin·lms가 같은 목록 UI
 * (`@ssccops/pwa/ui`)에 같은 모양을 넘기기 때문이다. 서버 DTO가 바뀌면 여기 한 곳이다.
 */

/** `noti_type_cd` — 서버 `NotificationType` */
export type NotificationType =
  | "APPROVAL_REQUESTED"
  | "APPROVAL_APPROVED"
  | "APPROVAL_REJECTED"
  | "DEADLINE_DUE"
  | "DEADLINE_OVERDUE";

/** `GET /v1/notifications`의 한 행 · 푸시 페이로드의 상위 집합 */
export interface NotificationItem {
  notificationId: number;
  type: NotificationType | string;
  title: string;
  body: string;
  app: PushApp;
  linkPath: string;
  targetType: string | null;
  targetId: number | null;
  readAt: string | null;
  createdAt: string;
}

/** `GET /v1/notifications?cursor&size` */
export interface NotificationPage {
  items: NotificationItem[];
  nextCursor: string | null;
  unreadCount: number;
}

/** `POST /v1/push/subscriptions` 본문 — `PushSubscription.toJSON()`에 `app`을 더한 것 */
export interface PushSubscriptionRequest {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime: string | null;
  app: PushApp;
}
