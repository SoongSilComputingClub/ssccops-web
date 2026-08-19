"use client";

import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { NAV_FOOT, groupHasActive } from "./nav";
import { NavPanel } from "./nav-panel";
import { useShellNav } from "./use-shell-nav";

/**
 * 데스크톱 사이드바 (lg 이상). 좁은 폭에서는 layout이 이것을 감추고 MobileNav를 띄운다 (#85).
 *
 * 접기(collapsed) 상태는 데스크톱 전용이다 — 모바일에는 상시 노출되는 레일이 없고
 * 드로어가 통째로 열리고 닫힌다.
 */
export function Sidebar() {
  const { pathname, groups, navigate, meName, meLabel } = useShellNav();
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex w-16 flex-none flex-col items-center gap-[10px] border-r border-black/8 bg-surface pt-[22px] pb-4">
        <div className="flex size-[30px] flex-none items-center justify-center rounded-[8px] border border-accent text-[15px] text-accent">
          S
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex size-8 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-line text-[15px] text-n400 hover:border-accent hover:text-accent"
        >
          ›
        </button>
        <div className="my-[2px] h-px w-6 bg-bg" />
        {groups.map((g) => (
          <button
            key={g.label}
            type="button"
            onClick={() => {
              setCollapsed(false);
              navigate(g.items[0].href);
            }}
            className={cn(
              "flex size-[38px] flex-none cursor-pointer items-center justify-center rounded-[12px] border text-[14.5px] font-semibold",
              groupHasActive(g, pathname)
                ? "border-accent bg-accent-soft text-accent"
                : "border-line bg-surface text-n500 hover:border-accent hover:text-accent",
            )}
          >
            {g.mono}
          </button>
        ))}
        <div className="flex-1" />
        <div className="my-[2px] h-px w-6 bg-bg" />
        <button
          type="button"
          onClick={() => {
            setCollapsed(false);
            navigate(NAV_FOOT.items[0].href);
          }}
          className={cn(
            "flex size-[38px] flex-none cursor-pointer items-center justify-center rounded-[12px] border text-[14.5px] font-semibold",
            groupHasActive(NAV_FOOT, pathname)
              ? "border-accent bg-accent-soft text-accent"
              : "border-line bg-surface text-n500 hover:border-accent hover:text-accent",
          )}
        >
          {NAV_FOOT.mono}
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-[230px] flex-none flex-col border-r border-black/8 bg-surface pt-[22px] pb-4">
      <div className="mb-3 flex items-center gap-[10px] border-b border-bg px-[18px] pb-4">
        <div className="flex size-7 flex-none items-center justify-center rounded-[7px] border border-accent text-[15px] text-accent">
          S
        </div>
        <div className="min-w-0 text-[16px] whitespace-nowrap">SSCC 운영관리</div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="flex size-7 flex-none cursor-pointer items-center justify-center rounded-[9px] border border-line text-[14px] text-n400 hover:border-accent hover:text-accent"
        >
          ‹
        </button>
      </div>

      <NavPanel
        groups={groups}
        pathname={pathname}
        onNavigate={navigate}
        meName={meName}
        meLabel={meLabel}
      />
    </div>
  );
}
