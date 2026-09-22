import type {
  NotificationItem,
  NotificationPage,
  PushApp,
  PushTestRequest,
  PushTestResult,
} from "@ssccops/pwa";
import { apiFetch } from "@/shared/lib/api/client";

/*
 * `/v1/notifications` — 내 알림 (#604 · ssccops#446 «API 계약» · ADR-0045).
 *
 * 목록은 `apiFetchList`(배열 + `page` 봉투)가 아니라 **`data`가 `{ items, nextCursor, unreadCount }`**다 —
 * 계약 표가 그렇게 적었고 `unreadCount`가 목록과 함께 와야 종 배지를 따로 부르지 않는다. 서버가 `page`
 * 봉투 쪽으로 만들면 이 파일 하나를 고친다(병렬 진행 — DTO 대조는 머지 뒤).
 *
 * `app`을 주면 **그 앱이 수신 앱인 알림만** 온다(server#535 · ADR-0047 — 기준표 `noti_type_rcpn`이
 * 정하고, 등록된 행이 없는 유형은 그 알림 행 자신의 `app`을 따른다). 함께 오는 `unreadCount`도 같은
 * 필터를 지난다. 주지 않으면 앱과 무관하게 전부다(«전체» 칩). 기준 코드에 없는 값은 400.
 *
 * 남의 알림은 404 — 화면은 «없는 알림»으로만 다룬다.
 */

/** 이 앱 — 목록·배지의 기본 필터이자 `NotificationList`의 `currentApp` (#643) */
export const CURRENT_APP: PushApp = "ADMIN";

export const notificationApi = {
  list: (params: { cursor?: string | null; size?: number; app?: PushApp | null } = {}) => {
    const query = new URLSearchParams();
    if (params.cursor) query.set("cursor", params.cursor);
    if (params.size) query.set("size", String(params.size));
    if (params.app) query.set("app", params.app);
    const qs = query.toString();
    return apiFetch<NotificationPage>(`/v1/notifications${qs ? `?${qs}` : ""}`);
  },

  unreadCount: (params: { app?: PushApp | null } = {}) =>
    apiFetch<{ unreadCount: number }>(
      `/v1/notifications/unread-count${params.app ? `?app=${params.app}` : ""}`,
    ),

  read: (notificationId: number) =>
    apiFetch<{ notificationId: number; readAt: string }>(
      `/v1/notifications/${notificationId}/read`,
      { method: "POST" },
    ),

  readAll: () => apiFetch<{ updated: number }>("/v1/notifications/read-all", { method: "POST" }),

  /**
   * 테스트 알림 — 호출자 자신에게 알림 행 + 자기 구독 전부로 푸시 (ssccops#454 · #616). `app`은 링크가
   * 갈 «내 정보»의 앱. 1분 3회를 넘기면 429 `RATE_LIMITED`(server#529) — 버튼(`@ssccops/pwa/ui`)이 문구로 가른다.
   */
  sendTest: (request: PushTestRequest) =>
    apiFetch<PushTestResult>("/v1/notifications/test", {
      method: "POST",
      body: JSON.stringify(request),
    }),
};

export type { NotificationItem, NotificationPage };
