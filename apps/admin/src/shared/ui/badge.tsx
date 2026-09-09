/*
 * 배지·필 — 구현은 `@ssccops/ui`에 있다 (ssccops#243).
 *
 * 세 앱이 같은 것을 각자 들고 있었다. admin 쪽이 자라 있어(빨강 톤·`title`·톤을 받는 `Pill`)
 * 그것을 기준으로 올렸고, 늘어난 prop은 전부 선택이라 www·lms 호출부는 그대로 돈다.
 */
export { Badge, Pill, type BadgeTone } from "@ssccops/ui";
