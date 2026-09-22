import type {
  NotificationItem,
  NotificationPage,
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
 * 남의 알림은 404 — 화면은 «없는 알림»으로만 다룬다.
 */
export const notificationApi = {
  list: (params: { cursor?: string | null; size?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.cursor) query.set("cursor", params.cursor);
    if (params.size) query.set("size", String(params.size));
    const qs = query.toString();
    return apiFetch<NotificationPage>(`/v1/notifications${qs ? `?${qs}` : ""}`);
  },

  unreadCount: () => apiFetch<{ unreadCount: number }>("/v1/notifications/unread-count"),

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
