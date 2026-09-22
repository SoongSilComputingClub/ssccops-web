"use client";

import { useEffect, useRef, useState } from "react";
import { AccountMenu, AccountSections, BrandMark, deployMarks, UtilityCluster } from "@ssccops/ui";
import { InstallMenuItem } from "@ssccops/pwa/ui";
import { NotificationBell } from "@/features/notification";
import { AppVersion } from "./app-version";
import { NavPanel } from "./nav-panel";
import { SitemapLink } from "./sitemap-link";
import { useNavAccordion } from "./use-nav-accordion";
import { ACCOUNT_LINKS, useShellNav } from "./use-shell-nav";

// 값은 이 파일에서 읽어 넘긴다 — 패키지 안에서 읽으면 NEXT_PUBLIC 인라인을 못 받는다(deploy-env.ts)
const DEPLOY = deployMarks(process.env.NEXT_PUBLIC_DEPLOY_ENV);

/**
 * 모바일 상단 바 + 드로어 (lg 미만, #85).
 *
 * 데스크톱 사이드바를 그대로 좁히지 않고 드로어로 바꾼 것은, 230px 사이드바를 남기면
 * 375px 화면에서 본문에 145px밖에 남지 않기 때문이다. 메뉴 목차와 권한 판정은
 * useShellNav 한 곳에서 오므로 사이드바와 어긋나지 않는다.
 *
 * ── 상단 바 `[☰] [브랜드] ──── [종] [아바타]` (#614 · ssccops#452) ──
 * 세 앱의 모바일 상단 바가 같은 모양이다. 아바타를 누르면 계정 메뉴(팝오버)가 뜨고, 드로어는
 * 목차 + 같은 계정 절(`AccountSections` — ②~⑥ 인라인)이다. 드로어에 계정 절을 한 번 더 두는 것은
 * 드로어를 연 사람이 «로그아웃이 어디 있지»를 상단 바로 돌아가 찾지 않게 하려는 것이고, 두 자리가
 * 같은 항목 배열을 받아 갈리지 않는다.
 *
 * 목차는 사이드바와 같은 아코디언이다(#635 — `useNavAccordion` · 같은 localStorage 키). 드로어를 여는
 * 순간 현재 묶음만 펼쳐져 있어 375px에서도 계정 절까지 한 화면에 든다.
 */
export function MobileNav() {
  const { pathname, groups, navigate, signOut, meName, meLabel, apps } = useShellNav();
  const accordion = useNavAccordion(groups, pathname);
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
      <div className="flex flex-none items-center gap-[10px] border-b border-hairline-strong bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="메뉴 열기"
          aria-expanded={open}
          className="flex size-10 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-line text-[17px] text-n400 hover:border-accent hover:text-accent"
        >
          ☰
        </button>
        <BrandMark src={DEPLOY.mark} size={28} />
        <div className="min-w-0 flex-1 truncate text-[16px]">SSCC 운영관리</div>
        {/* 종은 드로어가 아니라 여기다 — 열지 않고도 배지가 보여야 한다 (#604) */}
        <UtilityCluster bell={<NotificationBell />}>
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
          />
        </UtilityCluster>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          {/*
            스크림 — 클릭으로 닫히지만 키보드로 «누르는» 대상이 아니다. Esc는 위 effect가
            document에서 받는다. 보조기기에서는 치운다 (ssccops-web#403 · Sheet와 같은 판단).
          */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 animate-fade-in bg-scrim motion-reduce:animate-none"
          />
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="메뉴"
            className="absolute inset-y-0 left-0 flex w-[82%] max-w-[300px] flex-col border-r border-hairline-strong bg-surface pt-[22px] pb-4 outline-none"
          >
            <div className="mb-3 flex items-center gap-[10px] border-b border-bg px-[18px] pb-4">
              <BrandMark src={DEPLOY.mark} size={28} />
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

            {/* 목차와 계정 절이 함께 스크롤된다 — 짧은 화면에서 로그아웃이 잘리지 않게 */}
            <div className="flex-1 overflow-y-auto [overscroll-behavior:contain]">
              <NavPanel
                groups={groups}
                pathname={pathname}
                onNavigate={go}
                isOpen={accordion.isOpen}
                onToggle={accordion.toggle}
              />
              <SitemapLink pathname={pathname} onNavigate={go} className="mt-1 border-t border-bg" />
              <AccountSections
                links={ACCOUNT_LINKS}
                apps={apps}
                install={<InstallMenuItem />}
                onSignOut={signOut}
                onNavigate={navigate}
                onSelect={() => setOpen(false)}
                pathname={pathname}
                className="mt-2 px-[10px]"
              />
              <AppVersion />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
