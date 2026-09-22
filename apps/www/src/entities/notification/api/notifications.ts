"use client";

import type {
  NotificationItem,
  NotificationPage,
  PushTestRequest,
  PushTestResult,
} from "@ssccops/pwa";
import { apiFetchAuthedFromBrowser } from "@/shared/api/browser-client";
import { toQuery } from "@/shared/api/client";

/*
 * `/v1/notifications` — 내 알림 (#616 · ssccops#453 · ADR-0045 · admin #604·lms #606과 같은 계약).
 *
 * **브라우저 통로다.** 이 앱은 전 화면을 SSR로 그리지만(AGENTS.md) 알림은 «읽음 처리·더 보기»가 붙는
 * 화면이고 종 배지는 탭이 다시 보일 때마다 새로 듣는다 — 신청서·공개 폼의 초안 저장처럼 브라우저에서
 * 저장하는 것들과 같은 자리(`browser-client.ts`)다. 401·403은 오류로 올라오고 화면이 안내로 그린다
 * (리다이렉트 없음).
 *
 * 목록은 `apiFetchList`(배열 + `page` 봉투)가 아니라 **`data`가 `{ items, nextCursor, unreadCount }`**다 —
 * 계약 표(ssccops#446)가 그렇게 적었고 `unreadCount`가 목록과 함께 와야 종 배지를 따로 부르지 않는다.
 *
 * 회원이 여기서 받는 알림은 낸 응답의 검토 결과(`RESPONSE_*` → `/me/responses`·`/me/proposals`)와 행사
 * 참가 상태(`APPLICATION_*` → `/me/applications`)다. 운영진 계정이면 어드민 사건(`app = ADMIN`)도 같은
 * 목록에 온다 — 알림은 회원 단위라 앱마다 갈라 두지 않는다(ssccops#448).
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

  /**
   * 테스트 알림 — 호출자 자신에게 알림 행 + 자기 구독 전부로 푸시 (ssccops#454). `app`은 링크가 갈
   * «내 정보»의 앱(이 앱은 `/me`). 1분 3회를 넘기면 429 `TOO_MANY_REQUESTS` — 버튼(`@ssccops/pwa/ui`)이
   * 문구로 가른다.
   */
  sendTest: (request: PushTestRequest) =>
    apiFetchAuthedFromBrowser<PushTestResult>("/v1/notifications/test", {
      method: "POST",
      body: JSON.stringify(request),
    }),
};

export type { NotificationItem, NotificationPage };
