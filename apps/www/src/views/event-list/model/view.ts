import { EVENT_LIST_VIEW, type EventListView } from "@/shared/config/routes";

/**
 * `?view=` 쿼리 → 보기 방식 (#573 · ssccops#427).
 *
 * `list`만 리스트이고 나머지(없음 · 모르는 값 · 배열)는 전부 카드다 — 모르는 값에 404나 안내를
 * 두지 않는 것은 보기 방식이 «무엇을 보나»가 아니라 «어떻게 보나»라서다. 잘못 적힌 링크로 와도
 * 목록은 그대로 보여야 한다. 같은 키가 두 번 실리면 첫 값만 쓴다(분류 필터와 같은 규칙 —
 * app/events/page.tsx).
 */
export function parseEventListView(raw: string | string[] | undefined): EventListView {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === EVENT_LIST_VIEW ? EVENT_LIST_VIEW : "card";
}
