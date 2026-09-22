"use client";

import { useState } from "react";
import { AccountMenu, BrandMark, deployMarks, GroupIcon } from "@ssccops/ui";
import { InstallMenuItem } from "@ssccops/pwa/ui";
import { NotificationBell } from "@/features/notification";
import { cn } from "@/shared/lib/cn";
import { ROUTES } from "@/shared/config/routes";
import { AppVersion } from "./app-version";
import { groupHasActive } from "./nav";
import { NAV_FOCUS, NavPanel } from "./nav-panel";
import { SitemapLink } from "./sitemap-link";
import { useNavAccordion } from "./use-nav-accordion";
import { ACCOUNT_LINKS, useShellNav } from "./use-shell-nav";

// 값은 이 파일에서 읽어 넘긴다 — 패키지 안에서 읽으면 NEXT_PUBLIC 인라인을 못 받는다(deploy-env.ts)
const DEPLOY = deployMarks(process.env.NEXT_PUBLIC_DEPLOY_ENV);

const RAIL_BUTTON =
  "group relative flex size-[38px] flex-none cursor-pointer items-center justify-center rounded-[12px] border";

/**
 * 접힌 레일의 툴팁 — 오른쪽에 묶음명. 마우스를 올리거나 키보드 포커스가 오면 보인다 (#635).
 * 아이콘만 있는 버튼이라 이름은 `aria-label`이 들고, 이 상자는 보는 사람용이라 `aria-hidden`.
 */
function RailTip({ label }: Readonly<{ label: string }>) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-full z-10 ml-2 -translate-y-1/2 rounded-[8px] border border-line bg-surface px-2 py-1 text-[12.5px] whitespace-nowrap text-ink opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
    >
      {label}
    </span>
  );
}

/**
 * 데스크톱 사이드바 (lg 이상). 좁은 폭에서는 layout이 이것을 감추고 MobileNav를 띄운다 (#85).
 *
 * 접기(collapsed) 상태는 데스크톱 전용이다 — 모바일에는 상시 노출되는 레일이 없고
 * 드로어가 통째로 열리고 닫힌다.
 *
 * ── 머리·발치 (#614 · ssccops#452) ──────────────────────────
 * 머리는 `[브랜드] [접기]`뿐이고 발치는 `[전체 메뉴] [계정 메뉴 트리거 행] [종]`이다 — 메뉴는 위로 뜬다.
 * 테마 라디오·홍보/학술 링크·«홈 화면에 추가»·«내 계정»·«로그아웃» 행이 발치에 차례로 쌓이던
 * 것을 전부 계정 메뉴 안으로 넣었다. 종만 밖에 남는다 — 안 읽은 배지는 열지 않고도 보여야
 * 한다(#612에서 머리에서 프로필 행으로 옮긴 것이 그대로 발치의 짝이 됐다). 접힌 레일은 아바타
 * 버튼(같은 메뉴) + 종.
 *
 * ── 접힌 레일 = 묶음 아이콘 버튼 (#635 · ssccops#462) ──────────
 * «운·회·폼» 글자 타일 대신 묶음 이모지(`GroupIcon`)이고 툴팁이 묶음명이다. 누르면 **사이드바를
 * 펼치고 그 묶음을 연다** — 첫 항목으로 이동하지 않는다(펼친 상태의 머리글이 이동하지 않는 것과
 * 같은 규칙 · 레일에서 «지금 어디로 갈지»를 고르는 것은 펼친 뒤의 일이다).
 */
export function Sidebar() {
  const { pathname, groups, navigate, signOut, meName, meLabel, apps } = useShellNav();
  const accordion = useNavAccordion(groups, pathname);
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex w-16 flex-none flex-col items-center gap-[10px] border-r border-hairline-strong bg-surface pt-[22px] pb-4">
        <BrandMark src={DEPLOY.mark} size={30} radius={8} />
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="메뉴 펼치기"
          className={cn(
            "flex size-8 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-line text-[15px] text-n400 hover:border-accent hover:text-accent",
            NAV_FOCUS,
          )}
        >
          ›
        </button>
        <div className="my-[2px] h-px w-6 bg-bg" />
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            aria-label={g.label}
            aria-current={groupHasActive(g, pathname) ? "true" : undefined}
            onClick={() => {
              accordion.open(g.id);
              setCollapsed(false);
            }}
            className={cn(
              RAIL_BUTTON,
              NAV_FOCUS,
              groupHasActive(g, pathname)
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface hover:border-accent",
            )}
          >
            <GroupIcon emoji={g.emoji} />
            <RailTip label={g.label} />
          </button>
        ))}
        <button
          type="button"
          aria-label="전체 메뉴"
          aria-current={pathname.startsWith(ROUTES.sitemap) ? "page" : undefined}
          onClick={() => navigate(ROUTES.sitemap)}
          className={cn(
            RAIL_BUTTON,
            NAV_FOCUS,
            pathname.startsWith(ROUTES.sitemap)
              ? "border-accent bg-accent-soft text-accent"
              : "border-line bg-surface text-n500 hover:border-accent hover:text-accent",
          )}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path
              d="M4 6.5h14M4 11h14M4 15.5h14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <RailTip label="전체 메뉴" />
        </button>
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
          className={cn(
            "flex size-7 flex-none cursor-pointer items-center justify-center rounded-[9px] border border-line text-[14px] text-n400 hover:border-accent hover:text-accent",
            NAV_FOCUS,
          )}
        >
          ‹
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <NavPanel
          groups={groups}
          pathname={pathname}
          onNavigate={navigate}
          isOpen={accordion.isOpen}
          onToggle={accordion.toggle}
        />
      </div>

      <div className="mt-2 border-t border-bg pt-1">
        <SitemapLink pathname={pathname} onNavigate={navigate} />
        <div className="mt-1 flex items-center gap-[6px] px-[10px]">
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
