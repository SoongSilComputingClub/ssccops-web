import type { KeyboardEvent } from "react";

/*
 * Enter·Space를 «누름»으로 잇는다 (ssccops#286 · ssccops-web#403).
 *
 * `<div onClick>`에 `role="button"`·`tabIndex={0}`을 붙이면 Tab으로 닿기는 하지만 눌리지는
 * 않는다 — 네이티브 `<button>`이 공짜로 하는 Enter·Space 판정을 손으로 달아야 한다. 이런
 * 자리가 세 앱과 form-renderer에 걸쳐 있어 각자 판정하면 한 곳은 Space를 빼먹고 한 곳은
 * preventDefault를 빼먹는다. 판정을 여기 한 벌만 두고 가져다 쓴다.
 *
 * - **Space는 preventDefault** — 기본 동작이 페이지 스크롤이라 목록 카드에서 누르면 화면이
 *   튄다. Enter도 함께 막는다(막지 않을 이유가 없고, 두 키의 동작이 갈리면 그것이 버그다).
 * - **자기 자신에서 난 키만 받는다**(`target === currentTarget`). 이 헬퍼를 다는 자리는
 *   안에 버튼·링크·체크박스가 있어 `<button>`으로 못 바꾼 곳이다 — 안쪽 버튼에서 Enter를
 *   누르면 그 keydown이 바깥으로 번져 카드까지 함께 눌린다(GridTable 행 안의 «회원 보기»
 *   버튼, 회원 목록의 선택 체크박스가 정확히 이 경우). 클릭 쪽은 안쪽에서 stopPropagation을
 *   하고 있지만 키는 그 길을 지나지 않으므로 여기서 거른다.
 * - `<button>`으로 바꿀 수 있는 단순한 자리에는 쓰지 않는다 — 그쪽이 스크린리더에도 정확하다.
 */
export function onKeyActivate<E extends HTMLElement>(
  handler: (ev: KeyboardEvent<E>) => void,
): (ev: KeyboardEvent<E>) => void {
  return (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    if (ev.target !== ev.currentTarget) return;
    ev.preventDefault();
    handler(ev);
  };
}
