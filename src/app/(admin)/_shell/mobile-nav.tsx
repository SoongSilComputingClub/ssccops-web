"use client";

import { useEffect, useRef, useState } from "react";
import { NavPanel } from "./nav-panel";
import { useShellNav } from "./use-shell-nav";

/**
 * 모바일 상단 바 + 드로어 (lg 미만, #85).
 *
 * 데스크톱 사이드바를 그대로 좁히지 않고 드로어로 바꾼 것은, 230px 사이드바를 남기면
 * 375px 화면에서 본문에 145px밖에 남지 않기 때문이다. 메뉴 목차와 권한 판정은
 * useShellNav 한 곳에서 오므로 사이드바와 어긋나지 않는다.
 */
export function MobileNav() {
  const { pathname, groups, navigate, meName, meLabel } = useShellNav();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 이동하면 닫는다 — 열린 드로어가 새 화면을 덮은 채 남지 않게 한다
  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    // 드로어 뒤의 본문이 같이 스크롤되면 어디를 보고 있었는지 잃는다
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div className="flex flex-none items-center gap-[10px] border-b border-black/8 bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="메뉴 열기"
          aria-expanded={open}
          className="flex size-9 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-line text-[17px] text-n400 hover:border-accent hover:text-accent"
        >
          ☰
        </button>
        <div className="flex size-7 flex-none items-center justify-center rounded-[7px] border border-accent text-[15px] text-accent">
          S
        </div>
        <div className="min-w-0 truncate text-[16px]">SSCC 운영관리</div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div
            onClick={() => setOpen(false)}
            className="absolute inset-0 animate-fade-in bg-black/40"
          />
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="메뉴"
            className="absolute inset-y-0 left-0 flex w-[82%] max-w-[300px] flex-col border-r border-black/8 bg-surface pt-[22px] pb-4 outline-none"
          >
            <div className="mb-3 flex items-center gap-[10px] border-b border-bg px-[18px] pb-4">
              <div className="flex size-7 flex-none items-center justify-center rounded-[7px] border border-accent text-[15px] text-accent">
                S
              </div>
              <div className="min-w-0 text-[16px] whitespace-nowrap">SSCC 운영관리</div>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
                className="flex size-7 flex-none cursor-pointer items-center justify-center rounded-[9px] border border-line text-[14px] text-n400 hover:border-accent hover:text-accent"
              >
                ✕
              </button>
            </div>

            <NavPanel
              groups={groups}
              pathname={pathname}
              onNavigate={go}
              meName={meName}
              meLabel={meLabel}
            />
          </div>
        </div>
      )}
    </>
  );
}
