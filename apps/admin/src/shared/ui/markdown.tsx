/*
 * 본문 Markdown 렌더러 — 구현은 `@ssccops/ui`에 있다 (ssccops#243).
 *
 * 어드민이 이것을 쓰는 자리는 **입력 미리보기** 하나다(features/event/ui/event-form.tsx).
 * 미리보기 전용 렌더러를 따로 두지 않는 이유가 이 재export의 전부다 — 두 벌이면 "미리보기는
 * 맞는데 실제가 다른" 상태가 생기고, 그것은 미리보기가 없는 것보다 나쁘다.
 * 공개 앱(apps/www)도 같은 모양으로 이 패키지를 가리킨다.
 */
export { Markdown } from "@ssccops/ui";
