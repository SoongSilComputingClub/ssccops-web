"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PushSubscriptionRequest } from "./notification";
import type { PushApp } from "./service-worker";

/*
 * 푸시 구독 스위치의 상태 기계 (ADR-0045 · ssccops#447).
 *
 * 브라우저 쪽(권한·PushManager)과 서버 쪽(`/v1/push/*`)을 한 훅이 묶는다 — 둘 중 하나만 성공한
 * 채 끝나면 «켜져 있는데 안 온다»(서버 행 없음)나 «껐는데 온다»(브라우저 구독만 남음)가 되므로
 * 순서와 되돌리기를 여기 한 곳이 쥔다. 서버 호출 자체는 앱이 넘긴다 — 앱마다 인증 헤더·봉투
 * 처리가 다른 `apiFetch`를 갖고 있어서다(`@ssccops/auth`가 세션 갱신만 갖고 리다이렉트는 앱이
 * 하는 것과 같은 자리).
 *
 * ── 상태 ─────────────────────────────────────────────────────
 * - `unsupported`  Push API가 없거나(iOS 미설치 Safari · 프라이빗 창) 서비스워커가 등록돼 있지
 *                  않다(개발 모드). 화면은 iOS면 «홈 화면에 추가한 뒤» 안내를 덧붙인다.
 * - `denied`       브라우저 권한이 거부됨 — 화면에서 되돌릴 수 없다. 주소창 자물쇠에서 푼다.
 * - `off` · `on`   구독 없음 · 있음. `on`은 **브라우저 구독이 있다**는 뜻이지 서버 행이 있다는
 *                  보장은 아니다(서버 행은 마운트마다 조회하지 않는다 — 켤 때 등록하고 끌 때 지운다).
 * - `pending`      켜는·끄는 중.
 */
export type PushSubscriptionState = "unsupported" | "denied" | "off" | "on" | "pending";

export interface UsePushSubscriptionOptions {
  /** 이 앱 — 서버 구독 행의 `app_cd` */
  app: PushApp;
  /**
   * `GET /v1/push/config` — VAPID 공개키. **null이면 서버가 푸시를 끈 것**(키 미설정 ·
   * `ssccops.push.enabled=false` · server#527) — 구독을 만들지 않고 그 사실을 보인다.
   */
  getConfig: () => Promise<{ publicKey: string | null }>;
  /** `POST /v1/push/subscriptions` */
  subscribe: (request: PushSubscriptionRequest) => Promise<unknown>;
  /** `DELETE /v1/push/subscriptions` — 없는 endpoint면 서버가 404를 내도 성공으로 본다 */
  unsubscribe: (request: { endpoint: string }) => Promise<unknown>;
}

export interface PushSubscriptionControls {
  state: PushSubscriptionState;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  /** 마지막 켜기·끄기의 실패 — 화면이 한 줄로 보인다. 다음 시도에서 지워진다 */
  error: string | null;
}

function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * VAPID 공개키(base64url) → `applicationServerKey`.
 *
 * `PushManager.subscribe`는 문자열 키를 받는 브라우저도 있지만(Chrome) Safari는 바이트만 받는다 —
 * 세 앱이 같은 코드로 iOS까지 가야 하므로 언제나 바이트로 넘긴다.
 */
function toApplicationServerKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** `PushSubscription` → 서버 본문. 키가 빠진 구독은 서버가 받을 수 없어 오류로 세운다 */
function toRequest(subscription: PushSubscription, app: PushApp): PushSubscriptionRequest {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error("브라우저가 구독 키를 주지 않았습니다");
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh, auth },
    expirationTime:
      typeof json.expirationTime === "number"
        ? new Date(json.expirationTime).toISOString()
        : null,
    app,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "푸시 알림 설정에 실패했습니다 — 잠시 후 다시 시도해주세요";
}

export function usePushSubscription({
  app,
  getConfig,
  subscribe,
  unsubscribe,
}: UsePushSubscriptionOptions): PushSubscriptionControls {
  // 서버 렌더와 첫 클라이언트 렌더가 같아야 한다 — 판정은 effect에서
  const [state, setState] = useState<PushSubscriptionState>("pending");
  const [error, setError] = useState<string | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pushSupported()) return "unsupported" as const;
      /*
       * `serviceWorker.ready`는 등록이 없으면 영원히 기다린다 — 개발 모드가 그렇다. 등록 여부를
       * 먼저 보고, 있으면 활성화까지 기다린 뒤 구독을 읽는다.
       */
      const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);
      if (!registration) return "unsupported" as const;
      registrationRef.current = await navigator.serviceWorker.ready;
      if (Notification.permission === "denied") return "denied" as const;
      const current = await registrationRef.current.pushManager.getSubscription();
      return current ? ("on" as const) : ("off" as const);
    })()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) setState("unsupported");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    const registration = registrationRef.current;
    if (!registration || state === "pending" || state === "unsupported") return;
    setState("pending");
    setError(null);

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : "off");
      return;
    }

    let subscription: PushSubscription | null = null;
    try {
      const { publicKey } = await getConfig();
      if (!publicKey) {
        // 구독은 만들 수 있지만 받을 일이 없다 — 켜진 것처럼 보이는 쪽이 더 나쁘다
        setError("이 서버에는 푸시가 꺼져 있어요 — 운영진에게 알려 주세요");
        setState("off");
        return;
      }
      subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toApplicationServerKey(publicKey),
        }));
      await subscribe(toRequest(subscription, app));
      setState("on");
    } catch (failure: unknown) {
      /*
       * 서버 등록이 실패했으면 브라우저 구독을 되돌린다 — 남겨 두면 다음 마운트에서 `on`으로
       * 보이는데 서버는 이 기기를 모른다.
       */
      await subscription?.unsubscribe().catch(() => false);
      setError(errorMessage(failure));
      setState("off");
    }
  }, [app, getConfig, state, subscribe]);

  const disable = useCallback(async () => {
    const registration = registrationRef.current;
    if (!registration || state !== "on") return;
    setState("pending");
    setError(null);
    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        /*
         * 서버 행을 먼저 지운다. 브라우저 구독을 먼저 풀고 서버 호출이 실패하면 서버는 죽은
         * endpoint로 계속 보내다 410을 받고서야 지운다 — 반대 순서면 실패해도 «켜짐»으로 남아
         * 다시 끌 수 있다.
         */
        await unsubscribe({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setState("off");
    } catch (failure: unknown) {
      setError(errorMessage(failure));
      setState("on");
    }
  }, [state, unsubscribe]);

  return { state, enable, disable, error };
}
