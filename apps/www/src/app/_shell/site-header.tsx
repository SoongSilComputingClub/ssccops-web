"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

/**
 * 상단 바 껍데기 — 고정 + 스크롤한 뒤에만 경계 (#721 · ssccops#534).
 *
 * 그전에는 `layout.tsx`가 `<header className="border-b border-line bg-surface">`를 직접 그렸고
 * **스크롤하면 그냥 올라가 사라졌다.** 목차가 다섯 축 + 2단이 되면서(ADR-0056) 화면 어디에서든
 * 그 목차로 돌아갈 수 있어야 접은 뜻이 산다.
 *
 * **맨 위에서는 경계를 그리지 않는다.** 선과 그림자는 «본문이 지금 헤더 밑을 지나고 있다»는
 * 신호이고, 스크롤이 0일 때 그것을 그리면 뜻 없는 장식이 된다.
 *
 * ── 왜 `useSyncExternalStore`인가 ─────────
 * effect 안에서 `setState`로 스크롤 상태를 잡으면 한 프레임 늦게 그려지고
 * `react-hooks/set-state-in-effect`에도 걸린다(#712의 드롭다운에서 같은 자리를 밟았다).
 * 이 앱은 이미 같은 이유로 «브라우저에만 있는 값»을 이 훅으로 읽는다(`use-event-view-mode.ts`).
 * SSR 스냅샷은 `false` — 서버 HTML에는 경계가 없고, 스크롤된 채로 들어와도 첫 스크롤 이벤트에
 * 켜진다.
 *
 * 자식은 서버 컴포넌트 그대로 넘어온다(브랜드·목차·계정). 이 파일이 아는 것은 스크롤 위치뿐이다.
 */
export function SiteHeader({ children }: Readonly<{ children: ReactNode }>) {
  const scrolled = useSyncExternalStore(subscribe, isScrolled, () => false);

  return (
    <header
      /*
       * `z-[60]` — 모바일 드로어(`z-[80]`)보다 아래, 본문보다 위. 데스크톱 드롭다운은 이 헤더
       * 안에 있어(`z-[70]`) 같은 쌓임 맥락에서 헤더 위로 뜬다.
       *
       * 배경은 반투명 토큰(`bg-header`)이다. `backdrop-blur`는 **거드는 것**이고 기대지 않는다 —
       * 지원하지 않는 브라우저에서도 알파 0.82면 글자가 겹쳐 읽히지 않는다.
       */
      className={`sticky top-0 z-[60] border-b bg-header backdrop-blur-[10px] transition-[border-color,box-shadow] duration-150 ${
        scrolled
          ? "border-line shadow-[0_2px_10px_var(--color-header-edge)]"
          : "border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-shell items-center gap-[10px] px-[20px] py-[12px] lg:px-[28px]">
        {children}
      </div>
    </header>
  );
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

/* 4px — 관성 스크롤이 0 언저리에서 떠는 동안 경계가 깜빡이지 않을 만큼만 띄운다 */
function isScrolled(): boolean {
  return window.scrollY > 4;
}
