import type { PushSubscriptionRequest } from "./notification";

/*
 * `/v1/push/*` — Web Push 구독 호출 한 벌 (ssccops#446 «API 계약» · ADR-0045 · #671).
 *
 * 세 앱이 같은 세 호출을 각자 적고 있었다(`entities/push/api/push.ts` 44·44·38줄). 경로도 요청도
 * 응답도 계약이 정한 하나라 갈릴 자리가 없다 — `createNotificationApi`와 같은 자리이고, 갈리는 것은
 * **누가 보내느냐**(`apiFetch`)뿐이라 그것을 받아 나머지를 여기서 만든다.
 *
 * 세 함수는 `usePushSubscription`(`NotificationSettingsCard`가 안에서 부른다)에 그대로 넘어간다.
 * 401·403은 훅이 `error`로 올리고 스위치는 꺼진 채 남는다.
 */

/** 앱의 `apiFetch` — 봉투를 벗겨 `data`만 돌려주고 실패는 그 앱의 `ApiError`로 세운다 */
export type PushFetch = <T>(path: string, init?: RequestInit) => Promise<T>;

/** `data` 없는 200 봉투를 받는 통로 — 앱에 따로 있으면 넘긴다(www·lms의 `...NullableFromBrowser`) */
export type PushNullableFetch = <T>(path: string, init?: RequestInit) => Promise<T | null>;

export interface PushApi {
  /** VAPID 공개키 — null이면 서버가 푸시를 끈 것(훅이 그 사실을 보인다) */
  config: () => Promise<{ publicKey: string | null }>;
  /** 201 `{ subscriptionId }` · 같은 endpoint를 다시 보내면 200(갱신) */
  subscribe: (request: PushSubscriptionRequest) => Promise<{ subscriptionId: number }>;
  /** 404(서버가 모르는 endpoint)는 성공으로 삼킨다 — 아래 주석 */
  unsubscribe: (request: { endpoint: string }) => Promise<void>;
}

/**
 * 404인가 — 앱의 `ApiError` 클래스를 모르므로 `status` 필드만 본다(`PushTestButton`과 같은 규칙).
 * 세 앱 모두 이 자리에 오는 것은 `apiFetch`가 세운 `ApiError`뿐이다.
 */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { status?: unknown }).status === 404
  );
}

/**
 * 앱의 `apiFetch` 하나로 푸시 구독 호출 한 벌을 만든다.
 *
 * `apiFetchNullable`은 `data` 없는 200 봉투를 오류로 세우지 않는 통로다 — www·lms의
 * `apiFetchAuthedNullableFromBrowser`가 그것이고, 그런 통로가 따로 없는 앱(admin)은 넘기지 않는다.
 */
export function createPushApi(
  apiFetch: PushFetch,
  apiFetchNullable: PushNullableFetch = apiFetch,
): PushApi {
  return {
    config: () => apiFetch<{ publicKey: string | null }>("/v1/push/config"),

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
        await apiFetchNullable<unknown>("/v1/push/subscriptions", {
          method: "DELETE",
          body: JSON.stringify(request),
        });
      } catch (error: unknown) {
        if (isNotFound(error)) return;
        throw error;
      }
    },
  };
}
