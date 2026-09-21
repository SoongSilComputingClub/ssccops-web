"use client";

import type { NotificationItem, NotificationPage } from "@ssccops/pwa";
import { apiFetchAuthedFromBrowser } from "@/shared/api/browser-client";
import { toQuery } from "@/shared/api/client";

/*
 * `/v1/notifications` — 내 알림 (#606 · ssccops#446 «API 계약» · ADR-0045 · 어드민 #604와 같은 계약).
 *
 * **브라우저 통로다.** 이 앱은 조회를 서버 컴포넌트로 그리지만(AGENTS.md) 알림은 «읽음 처리·더 보기»가
 * 붙는 화면이고 종 배지는 탭이 다시 보일 때마다 새로 듣는다 — 회차 기록·공유 링크처럼 브라우저에서
 * 저장하는 것들과 같은 자리(`browser-client.ts`)다. 401·403은 오류로 올라오고 화면이 안내로 그린다.
 *
 * 목록은 `apiFetchList`(배열 + `page` 봉투)가 아니라 **`data`가 `{ items, nextCursor, unreadCount }`**다 —
 * 계약 표가 그렇게 적었고 `unreadCount`가 목록과 함께 와야 종 배지를 따로 부르지 않는다. 서버가 `page`
 * 봉투 쪽으로 만들면 이 파일 하나를 고친다(어드민 `entities/notification/api`와 함께 DTO 대조).
 *
 * 남의 알림은 404 — 화면은 «없는 알림»으로만 다룬다.
 */
export const notificationApi = {
  list: (params: { cursor?: string | null; size?: number } = {}) =>
    apiFetchAuthedFromBrowser<NotificationPage>(
      `/v1/notifications${toQuery({ cursor: params.cursor, size: params.size })}`,
    ),

  unreadCount: () =>
    apiFetchAuthedFromBrowser<{ unreadCount: number }>("/v1/notifications/unread-count"),

  read: (notificationId: number) =>
    apiFetchAuthedFromBrowser<{ notificationId: number; readAt: string }>(
      `/v1/notifications/${notificationId}/read`,
      { method: "POST" },
    ),

  readAll: () =>
    apiFetchAuthedFromBrowser<{ updated: number }>("/v1/notifications/read-all", {
      method: "POST",
    }),
};

export type { NotificationItem, NotificationPage };
