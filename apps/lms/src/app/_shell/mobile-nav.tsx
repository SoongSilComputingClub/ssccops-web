"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { siteLinks } from "@/shared/config/site-links";
import { ThemeToggle } from "@/shared/ui";
import { visibleNavGroups } from "./nav-links";

/**
 * 모바일 상단 바 드로어 (lg 미만, #169).
 *
 * 학술 공개 앱은 역할별로 대여섯 개 메뉴가 있어 좁은 화면에서 상단 바가 넘친다 — 처음부터
 * 접히는 구조로 둔다. apps/www·어드민 드로어와 같은 뼈대다.
 *
 * **목차는 데스크톱 메뉴와 같은 필터를 탄다**(`visibleNavGroups` · #224) — 한쪽에만 필터를
 * 걸면 좁은 화면에서 스터디장 메뉴가 그대로 보인다. 판정(`isLeader`)은 루트 레이아웃이
 * 서버에서 한 번 해 두 컴포넌트에 같은 값으로 내려보낸다.
 *
 * **드로어는 묶음을 접지 않고 제목 + 항목으로 펼쳐 둔다.** 좁은 화면은 세로로 길어 자리가
 * 넉넉하고, 여기서까지 묶음을 눌러 펼치게 하면 데스크톱(상단 바 → 탭줄)보다 한 단계가 더
 * 는다 — 드로어를 여는 것 자체가 이미 한 단계다. 묶음 제목은 링크가 아니라 라벨이다(그 자리를
 * 누르면 어디로 가는지가 항목 목록과 겹쳐 모호하다).
 *
 * 열렸을 때 본문 스크롤을 잠그고, ESC·바깥 클릭·항목 이동으로 닫는 규약도 어드민과 같다.
 */
export function MobileNav({ isLeader }: Readonly<{ isLeader: boolean }>) {
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
          {/*
            스크림 — 클릭으로 닫히지만 키보드로 «누르는» 대상이 아니다. Esc는 위 effect가
            document에서 받는다. 보조기기에서는 치운다 (ssccops-web#403 · Sheet와 같은 판단).
          */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 animate-fade-in bg-scrim"
          />
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="메뉴"
            className="absolute inset-y-0 right-0 flex w-[78%] max-w-[280px] flex-col border-l border-hairline-strong bg-surface pt-[22px] pb-4 outline-none"
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
            <nav
              aria-label="주 메뉴"
              className="flex flex-col gap-[14px] overflow-y-auto px-[10px]"
            >
              {visibleNavGroups(isLeader).map((group) => (
                <div key={group.label} className="flex flex-col">
                  {/*
                    항목이 하나뿐인 묶음(학술 대시보드)은 제목을 그리지 않는다 — 같은 글자가
                    바로 아래 링크로 한 번 더 나온다.
                  */}
                  {group.links.length > 1 && (
                    <div className="px-[12px] pb-[4px] text-[12px] font-semibold text-n500">
                      {group.label}
                    </div>
                  )}
                  {group.links.map((link) => {
                    const active = link.isActive(pathname);
                    return (
                      <Link
                        key={link.label}
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
                </div>
              ))}
            </nav>

            {/*
             * 테마는 목차 아래 발치에 둔다 (#341 · 어드민 사이드바와 같은 자리). 상단 바의
             * 아이콘 버튼과 **같은 상태를 본다** — `useTheme`이 구독이라 한쪽에서 바꾸면
             * 다른 쪽 표시도 함께 맞는다(각자 state를 쥐면 갈린다).
             *
             * `mt-auto`로 아래에 붙이는 것은 목차가 짧은 일반 회원(항목 둘)의 드로어에서
             * 메뉴 바로 밑에 떠 있지 않게 하려는 것이다.
             */}
            <div className="mt-auto px-[18px] pt-4">
              {/* 홈페이지(www) — 드로어에서는 발치, 테마 위 (#577) */}
              {siteLinks().map((site) => (
                <a
                  key={site.href}
                  href={site.href}
                  className="mb-3 block rounded-[10px] px-[12px] py-[11px] text-[15px] text-ink hover:bg-bg"
                >
                  {site.label} <span className="text-[13px] text-n500">↗</span>
                </a>
              ))}
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
