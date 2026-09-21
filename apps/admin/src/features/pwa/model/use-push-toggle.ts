"use client";

import { usePushSubscription, useInstallPrompt, type PushSubscriptionState } from "@ssccops/pwa";
import { pushApi } from "@/entities/push";

/*
 * «푸시 알림» 스위치 — `/my`의 한 카드 (#604 · ssccops#447).
 *
 * 상태 기계는 `@ssccops/pwa`가 갖고, 이 훅은 admin의 `pushApi`를 꽂고 화면 문구를 붙인다. lms(#448)가
 * 같은 모양으로 자기 `apiFetch`를 꽂는다.
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

const DESCRIPTION: Record<PushSubscriptionState, string> = {
  unsupported: "이 브라우저는 푸시 알림을 지원하지 않습니다.",
  denied: "브라우저에서 알림이 차단돼 있습니다. 주소창의 사이트 설정에서 알림을 허용한 뒤 다시 켜주세요.",
  off: "꺼져 있습니다. 켜면 이 기기로 승인 요청·결과·마감 알림이 옵니다.",
  on: "켜져 있습니다. 이 기기로 승인 요청·결과·마감 알림이 옵니다.",
  pending: "확인 중입니다.",
};

/** iOS는 홈 화면에 추가한 뒤에만 푸시가 된다(16.4+) — 설치 전 Safari에는 PushManager가 없다 */
const IOS_HINT = " iPhone·iPad는 홈 화면에 추가한 뒤 켤 수 있습니다.";

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
  const description =
    DESCRIPTION[push.state] + (push.state === "unsupported" && isIos && !isStandalone ? IOS_HINT : "");

  return {
    state: push.state,
    on,
    interactive,
    toggle: () => (on ? push.disable() : push.enable()),
    description,
    error: push.error,
  };
}
