"use client";

import type { PushSubscriptionRequest } from "@ssccops/pwa";
import {
  apiFetchAuthedFromBrowser,
  apiFetchAuthedNullableFromBrowser,
} from "@/shared/api/browser-client";
import { ApiError } from "@/shared/api/client";

/*
 * `/v1/push/*` — Web Push 구독 (#616 · ssccops#453 · ADR-0045 · admin #604·lms #606과 같은 계약).
 *
 * `usePushSubscription`(`@ssccops/pwa`)에 그대로 넘기는 세 함수다. 요청·응답 모양은 계약 표 그대로이고
 * 타입은 패키지가 든다 — 세 앱이 같은 모양을 보내고 다른 것은 `app: "WWW"` 하나. 브라우저에서만 부르므로
 * `browser-client.ts`를 탄다. 401·403은 훅이 `error`로 올리고 스위치는 꺼진 채 남는다.
 */
export const pushApi = {
  /** VAPID 공개키 — null이면 서버가 푸시를 끈 것(훅이 그 사실을 보인다) */
  config: () => apiFetchAuthedFromBrowser<{ publicKey: string | null }>("/v1/push/config"),

  /** 201 `{ subscriptionId }` · 같은 endpoint를 다시 보내면 200(갱신) */
  subscribe: (request: PushSubscriptionRequest) =>
    apiFetchAuthedFromBrowser<{ subscriptionId: number }>("/v1/push/subscriptions", {
      method: "POST",
      body: JSON.stringify(request),
    }),

  /**
   * 구독 삭제. 서버가 모르는 endpoint(이미 지워졌거나 410으로 정리됨)는 404를 내도 성공으로 본다 —
   * 어느 쪽이든 브라우저 구독은 풀어야 하고, 되돌릴 서버 행이 없다. 응답은 `data` 없는 200 봉투라
   * `Nullable` 통로다 — `apiFetchAuthedFromBrowser`는 `data: null`을 오류로 세운다.
   */
  unsubscribe: async (request: { endpoint: string }) => {
    try {
      await apiFetchAuthedNullableFromBrowser<unknown>("/v1/push/subscriptions", {
        method: "DELETE",
        body: JSON.stringify(request),
      });
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 404) return;
      throw error;
    }
  },
};
