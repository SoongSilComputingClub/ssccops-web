import type { PushSubscriptionState } from "./use-push-subscription";

/*
 * «푸시 알림» 스위치 아래 한 문단 — 상태별 문구 (ssccops#447 · #606).
 *
 * admin(#604)의 `usePushToggle`이 `DESCRIPTION` 표로 갖던 것을 lms(#606)가 같은 글자로 쓰게 되어
 * 올렸고, #616에서 admin도 이 함수로 바꿨다. 알림은 회원 단위라(ssccops#448) 어느 앱에서 켜든 같은
 * 알림이 온다 — 그래서 문구도 한 벌이다. 무엇이 오는지는 나열하지 않는다 — 운영진에게는 승인
 * 요청·마감이고 회원에게는 낸 응답의 결과·참가 상태라(ssccops#453) 한 줄에 다 적으면 자기 것이
 * 아닌 항목이 섞인다. 종류는 각 앱 `/notifications`의 부제가 말한다.
 */
const DESCRIPTION: Record<PushSubscriptionState, string> = {
  unsupported: "이 브라우저는 푸시 알림을 지원하지 않습니다.",
  denied: "브라우저에서 알림이 차단돼 있습니다. 주소창의 사이트 설정에서 알림을 허용한 뒤 다시 켜주세요.",
  off: "꺼져 있습니다. 켜면 이 기기로 알림이 옵니다.",
  on: "켜져 있습니다. 이 기기로 알림이 옵니다.",
  pending: "확인 중입니다.",
};

/** iOS는 홈 화면에 추가한 뒤에만 푸시가 된다(16.4+) — 설치 전 Safari에는 PushManager가 없다 */
const IOS_HINT = " iPhone·iPad는 홈 화면에 추가한 뒤 켤 수 있습니다.";

/**
 * 상태 → 스위치 아래 문장. `unsupported`인데 iOS 미설치 Safari면 «홈 화면에 추가한 뒤» 한 줄을 덧붙인다
 * (`useInstallPrompt`의 `isIos`·`isStandalone`을 넘긴다).
 */
export function pushStateDescription(
  state: PushSubscriptionState,
  ctx: { isIos: boolean; isStandalone: boolean },
): string {
  const hint = state === "unsupported" && ctx.isIos && !ctx.isStandalone ? IOS_HINT : "";
  return DESCRIPTION[state] + hint;
}
