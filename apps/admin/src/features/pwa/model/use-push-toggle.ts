"use client";

import {
  pushStateDescription,
  useInstallPrompt,
  usePushSubscription,
  type PushSubscriptionState,
} from "@ssccops/pwa";
import { pushApi } from "@/entities/push";

/*
 * «푸시 알림» 스위치 — `/my`의 한 카드 (#604 · ssccops#447).
 *
 * 상태 기계는 `@ssccops/pwa`가 갖고, 이 훅은 admin의 `pushApi`를 꽂는다. lms(#606)·www(#616)가 같은
 * 모양으로 자기 `apiFetch`를 꽂는다. 스위치 아래 문구도 패키지(`pushStateDescription`)다 — 여기 있던
 * `DESCRIPTION` 표를 #616에서 걷었다(알림은 회원 단위라 어느 앱에서 켜든 같은 것이 오고, 문구도 한 벌).
 */

export interface PushToggle {
  state: PushSubscriptionState;
  on: boolean;
  /** 스위치를 누를 수 있는가 — `unsupported`·`denied`·`pending`은 잠근다 */
  interactive: boolean;
  toggle: () => Promise<void>;
  /** 스위치 아래 한 문단 */
  description: string;
  /** 켜기·끄기의 실패 — 한 줄. 없으면 null */
  error: string | null;
}

export function usePushToggle(): PushToggle {
  const push = usePushSubscription({
    app: "ADMIN",
    getConfig: pushApi.config,
    subscribe: pushApi.subscribe,
    unsubscribe: pushApi.unsubscribe,
  });
  const { isIos, isStandalone } = useInstallPrompt();

  const on = push.state === "on";
  const interactive = push.state === "on" || push.state === "off";

  return {
    state: push.state,
    on,
    interactive,
    toggle: () => (on ? push.disable() : push.enable()),
    description: pushStateDescription(push.state, { isIos, isStandalone }),
    error: push.error,
  };
}
