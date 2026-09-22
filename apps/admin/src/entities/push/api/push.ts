import type { PushSubscriptionRequest } from "@ssccops/pwa";
import { ApiError, apiFetch } from "@/shared/lib/api/client";

/*
 * `/v1/push/*` — Web Push 구독 (#604 · ssccops#446 «API 계약» · ADR-0045).
 *
 * `usePushSubscription`(`@ssccops/pwa`)에 그대로 넘기는 세 함수다. 요청·응답 모양은 계약 표 그대로이고
 * 타입은 패키지가 든다(admin·lms가 같은 모양을 보낸다). 서버가 병렬로 만들어지고 있어 아직 닿을 수
 * 없다 — 404·네트워크 오류는 훅이 `error`로 올리고 스위치는 꺼진 채 남는다.
 */
export const pushApi = {
  /** VAPID 공개키 */
  config: () => apiFetch<{ publicKey: string | null }>("/v1/push/config"),

  /** 201 `{ subscriptionId }` · 같은 endpoint를 다시 보내면 200(갱신) */
  subscribe: (request: PushSubscriptionRequest) =>
    apiFetch<{ subscriptionId: number }>("/v1/push/subscriptions", {
      method: "POST",
      body: JSON.stringify(request),
    }),

  /**
   * 구독 삭제. 서버가 모르는 endpoint(이미 지워졌거나 410으로 정리됨)는 404를 내도 성공으로 본다 —
   * 어느 쪽이든 브라우저 구독은 풀어야 하고, 되돌릴 서버 행이 없다.
   */
  unsubscribe: async (request: { endpoint: string }) => {
    try {
      await apiFetch<void>("/v1/push/subscriptions", {
        method: "DELETE",
        body: JSON.stringify(request),
      });
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 404) return;
      throw error;
    }
  },
};
