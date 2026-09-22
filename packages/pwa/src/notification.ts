import type { PushApp } from "./service-worker";

/*
 * 알림·푸시 구독의 계약 타입 — 서버 표 그대로 (ssccops#446 «API 계약»).
 *
 * 앱의 `entities/*`가 응답 타입을 따로 갖지 않고 이것을 쓴다 — admin·lms·www가 같은 목록 UI
 * (`@ssccops/pwa/ui`)에 같은 모양을 넘기기 때문이다. 서버 DTO가 바뀌면 여기 한 곳이다.
 */

/**
 * `noti_type_cd` — 서버 `NotificationType`.
 *
 * 다섯은 운영진 사건(ssccops#446 · 승인·마감), 여섯은 회원 사건(ssccops#453 · 낸 응답의 검토 결과와
 * 행사 참가 상태 · `app = WWW`), `TEST`는 «내 정보»의 테스트 알림(ssccops#454 · 그 앱의 내 정보 경로).
 */
export type NotificationType =
  | "APPROVAL_REQUESTED"
  | "APPROVAL_APPROVED"
  | "APPROVAL_REJECTED"
  | "DEADLINE_DUE"
  | "DEADLINE_OVERDUE"
  | "RESPONSE_ACCEPTED"
  | "RESPONSE_REJECTED"
  | "RESPONSE_CHANGES_REQUESTED"
  | "APPLICATION_CONFIRMED"
  | "APPLICATION_WAITLISTED"
  | "APPLICATION_CANCELLED"
  | "TEST";

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

/** `POST /v1/notifications/test` 본문 — 어느 앱의 «내 정보»로 링크할지 (ssccops#454) */
export interface PushTestRequest {
  app: PushApp;
}

/** `POST /v1/notifications/test` 응답 — `pushed`는 푸시를 보낸 구독(기기) 수 */
export interface PushTestResult {
  notificationId: number;
  pushed: number;
}
