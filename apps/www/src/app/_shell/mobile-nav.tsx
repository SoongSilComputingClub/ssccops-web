"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_LINKS } from "./nav-links";

/**
 * 모바일 상단 바 드로어 (lg 미만, #167).
 *
 * 메뉴가 하나뿐인 지금은 드로어가 과해 보이지만, 이 앱은 소개·활동 같은 항목이 붙기로 돼 있다
 * (ssccops#150). 항목이 늘어나면 좁은 화면에서 상단 바가 넘치므로 처음부터 접히는 구조로 둔다 —
 * 어드민 드로어(`apps/admin/.../_shell/mobile-nav.tsx`)와 같은 뼈대이되 권한 게이트가 없어
 * 그만큼 단순하다.
 *
 * 열렸을 때 본문 스크롤을 잠그고, ESC·바깥 클릭·항목 이동으로 닫는 규약도 어드민과 같다.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="메뉴 열기"
        aria-expanded={open}
        className="flex size-9 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-line text-[17px] text-n400 hover:border-accent hover:text-accent lg:hidden"
      >
        ☰
      </button>

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
            className="absolute inset-y-0 right-0 flex w-[78%] max-w-[280px] flex-col border-l border-black/8 bg-surface pt-[22px] pb-4 outline-none"
          >
            <div className="mb-3 flex items-center justify-between border-b border-bg px-[18px] pb-4">
              <b className="text-[15px]">메뉴</b>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
                className="flex size-8 items-center justify-center rounded-[8px] text-[18px] text-n400 hover:text-ink"
              >
                ×
              </button>
            </div>
            <nav aria-label="주 메뉴" className="flex flex-col px-[10px]">
              {NAV_LINKS.map((link) => {
                const active = link.isActive(pathname);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    // 이동하면 닫는다 — 열린 드로어가 새 화면을 덮은 채 남지 않게 한다.
                    // 경로 변화를 effect로 감시하지 않고 클릭에서 닫는 것은, 상태 변경을
                    // 렌더 뒤 effect에 미루면 한 프레임 열린 채 그려지기 때문이다(react-hooks 규칙).
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "rounded-[10px] bg-accent-soft px-[12px] py-[11px] text-[15px] font-semibold text-accent"
                        : "rounded-[10px] px-[12px] py-[11px] text-[15px] text-ink hover:bg-bg"
                    }
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
