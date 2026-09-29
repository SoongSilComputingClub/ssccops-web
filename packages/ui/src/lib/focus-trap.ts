"use client";

import { useEffect, type RefObject } from "react";

/*
 * 오버레이의 초점 관리 — 안으로 넣고, 못 나가게 하고, 닫히면 돌려준다 (ssccops#511 · web#692).
 *
 * 다섯 오버레이(어드민 Sheet · 도우미 패널 · 세 앱의 모바일 드로어)가 `role="dialog"`·
 * `aria-modal`·Escape·`aria-hidden` 스크림까지는 각자 갖췄는데 **초점만 제각각이었다** —
 * Sheet는 돌려주지만 가두지 못했고, 드로어 셋은 가두지도 돌려주지도 않았다. Sheet의 주석은
 * «드로어와 같은 방식이다»라고 적고 있었지만 실제로는 같지 않았다. 판정이 다섯 벌이면 그중
 * 하나가 빠진 것을 타입도 린트도 잡지 못한다 — 그래서 한 벌만 둔다.
 *
 * **`aria-modal="true"`는 보조기기에게 «뒤는 없다»고 말할 뿐 Tab을 막지 못한다.** `<dialog>`를
 * `showModal()`로 열면 브라우저가 top-layer inert로 막아 주지만, 어드민 Sheet는 스크림·z-index를
 * 직접 정하려고 `open` 속성만 쓴다(근거는 `sheet.tsx`에 있다). 그래서 손으로 잇는다.
 */

/**
 * Tab이 패널 밖으로 새지 않게 양 끝을 잇는다.
 *
 * 이미 초점이 밖으로 나가 있으면 **끌고 들어온다** — 패널에만 리스너를 달면 한 번 새어 나간
 * 뒤에는 이 함수가 아예 불리지 않아 돌아올 길이 없다. 그래서 `useFocusTrap`은 document에서 받는다.
 */
export function trapFocus(e: KeyboardEvent, panel: HTMLElement | null): void {
  if (e.key !== "Tab" || !panel) return;

  const focusable = panel.querySelectorAll<HTMLElement>(
    'button:not([disabled]), textarea:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;

  const active = document.activeElement;
  if (active instanceof Node && !panel.contains(active)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
    return;
  }

  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * 열리면 패널로 초점을 옮기고 Tab을 가두며, 닫히면 **열었던 자리로 돌려준다.**
 *
 * 돌려주지 않으면 Escape로 닫았을 때 초점이 사라진 패널에 남아 다음 Tab이 문서 맨 위에서 다시
 * 시작한다 — 키보드 사용자는 햄버거 버튼으로 돌아가려고 상단 바까지 Tab을 되짚어야 한다.
 *
 * 패널에는 `tabIndex={-1}`이 있어야 한다. 거기에 초점을 두면 안의 첫 입력이 무엇이든 다음 Tab이
 * 그것으로 간다 — 첫 요소를 골라 focus하면 그 «첫»의 정의가 화면마다 갈린다.
 */
export function useFocusTrap(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => trapFocus(e, panelRef.current);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open, panelRef]);
}
