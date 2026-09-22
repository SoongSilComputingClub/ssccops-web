"use client";

import { useState } from "react";
import { AccountMenu, BrandMark, deployMarks } from "@ssccops/ui";
import { InstallMenuItem } from "@ssccops/pwa/ui";
import { NotificationBell } from "@/features/notification";
import { cn } from "@/shared/lib/cn";
import { AppVersion } from "./app-version";
import { groupHasActive } from "./nav";
import { NavPanel } from "./nav-panel";
import { ACCOUNT_LINKS, useShellNav } from "./use-shell-nav";

// 값은 이 파일에서 읽어 넘긴다 — 패키지 안에서 읽으면 NEXT_PUBLIC 인라인을 못 받는다(deploy-env.ts)
const DEPLOY = deployMarks(process.env.NEXT_PUBLIC_DEPLOY_ENV);

/**
 * 데스크톱 사이드바 (lg 이상). 좁은 폭에서는 layout이 이것을 감추고 MobileNav를 띄운다 (#85).
 *
 * 접기(collapsed) 상태는 데스크톱 전용이다 — 모바일에는 상시 노출되는 레일이 없고
 * 드로어가 통째로 열리고 닫힌다.
 *
 * ── 머리·발치 (#614 · ssccops#452) ──────────────────────────
 * 머리는 `[브랜드] [접기]`뿐이고 발치는 `[계정 메뉴 트리거 행] [종]`이다 — 메뉴는 위로 뜬다.
 * 테마 라디오·홍보/학술 링크·«홈 화면에 추가»·«내 계정»·«로그아웃» 행이 발치에 차례로 쌓이던
 * 것을 전부 계정 메뉴 안으로 넣었다. 종만 밖에 남는다 — 안 읽은 배지는 열지 않고도 보여야
 * 한다(#612에서 머리에서 프로필 행으로 옮긴 것이 그대로 발치의 짝이 됐다). 접힌 레일은 아바타
 * 버튼(같은 메뉴) + 종.
 */
export function Sidebar() {
  const { pathname, groups, navigate, signOut, meName, meLabel, apps } = useShellNav();
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex w-16 flex-none flex-col items-center gap-[10px] border-r border-hairline-strong bg-surface pt-[22px] pb-4">
        <BrandMark src={DEPLOY.mark} size={30} radius={8} />
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="메뉴 펼치기"
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
        <NotificationBell size="sm" />
        {/* 레일에서는 메뉴가 오른쪽 위로 펼쳐진다 — 64px 안에 들어갈 폭이 아니다 */}
        <AccountMenu
          name={meName}
          label={meLabel}
          links={ACCOUNT_LINKS}
          apps={apps}
          install={<InstallMenuItem />}
          onSignOut={signOut}
          onNavigate={navigate}
          pathname={pathname}
          trigger="avatar"
          placement="up"
          align="start"
        />
      </div>
    );
  }

  return (
    <div className="flex w-[230px] flex-none flex-col border-r border-hairline-strong bg-surface pt-[22px] pb-4">
      <div className="mb-3 flex items-center gap-[10px] border-b border-bg px-[18px] pb-4">
        <BrandMark src={DEPLOY.mark} size={28} />
        <div className="min-w-0 text-[16px] whitespace-nowrap">SSCC 운영관리</div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="메뉴 접기"
          className="flex size-7 flex-none cursor-pointer items-center justify-center rounded-[9px] border border-line text-[14px] text-n400 hover:border-accent hover:text-accent"
        >
          ‹
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <NavPanel groups={groups} pathname={pathname} onNavigate={navigate} />
      </div>

      <div className="mt-2 border-t border-bg pt-2">
        <div className="flex items-center gap-[6px] px-[10px]">
          <AccountMenu
            name={meName}
            label={meLabel}
            links={ACCOUNT_LINKS}
            apps={apps}
            install={<InstallMenuItem />}
            onSignOut={signOut}
            onNavigate={navigate}
            pathname={pathname}
            trigger="row"
            placement="up"
            align="start"
            className="min-w-0 flex-1"
          />
          <NotificationBell size="sm" />
        </div>
        <AppVersion />
      </div>
    </div>
  );
}
