"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InstallMenuItem } from "@ssccops/pwa/ui";
import { AccountSections, useFocusTrap } from "@ssccops/ui";
import { ACCOUNT_LINKS, SignInButton, accountApps, useAuthSession } from "@/features/auth";
import { NAV_LINKS } from "./nav-links";

/**
 * 모바일 상단 바 드로어 (lg 미만, #167).
 *
 * 항목이 늘어나면 좁은 화면에서 상단 바가 넘치므로 처음부터 접히는 구조로 둔다 — 어드민
 * 드로어(`apps/admin/.../_shell/mobile-nav.tsx`)와 같은 뼈대이되 권한 게이트가 없어 그만큼 단순하다.
 *
 * ── ☰은 왼쪽, 드로어도 왼쪽에서 (#614 · ssccops#452) ─────────
 * 세 앱의 모바일 상단 바가 `[☰] [브랜드] ──── [종] [아바타]` 한 모양이다. 발치는 계정 절
 * (`AccountSections` — 내 활동·테마·학술 LMS·홈 화면에 추가·로그아웃)이고 상단 바의 계정 메뉴와
 * 같은 항목을 받는다. 로그인 전이면 «로그인» 하나 — 테마는 푸터에 있어 드로어에 두지 않는다.
 * «LMS ↗» 행·테마 라디오가 여기 따로 서 있던 것을 그 절이 흡수했다. 로그인 판정은 상단 바와 같은
 * `useAuthSession`(브라우저 로컬 쿠키 — 홈이 세션을 보지 않는 규칙은 그대로다 · ssccops#385).
 *
 * 열렸을 때 본문 스크롤을 잠그고, ESC·바깥 클릭·항목 이동으로 닫는 규약도 어드민과 같다.
 */
export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { signedIn, signOut, signingOut } = useAuthSession();
  const [open, setOpen] = useState(false);
  /*
   * 펼친 축 (#731 · ssccops#533). **드로어를 열 때마다 «지금 화면이 속한 축만»으로 다시 정한다** —
   * 여는 버튼에서 정하므로 effect가 없고, 기억하지도 않는다(아래 목차 주석).
   */
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  const openDrawer = () => {
    setExpanded(
      new Set(
        NAV_LINKS.filter((l) => l.children?.length && l.isActive(pathname)).map((l) => l.href),
      ),
    );
    setOpen(true);
  };

  const toggleAxis = (href: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    // 드로어 뒤의 본문이 같이 스크롤되면 어디를 보고 있었는지 잃는다
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  /*
   * 초점 — 안으로 넣고, 가두고, 닫히면 **햄버거 버튼으로 돌려준다** (#692 · ssccops#511).
   *
   * 위 effect가 하던 것은 «안으로 넣기» 하나뿐이었다. 그래서 Escape로 닫으면 초점이 사라진
   * 패널에 남아 다음 Tab이 문서 맨 위에서 다시 시작했고, 열려 있는 동안에는 Tab이 스크림 뒤
   * 화면을 돌았다. 세 앱의 드로어와 어드민 Sheet가 같은 한 벌을 쓴다.
   */
  useFocusTrap(open, panelRef);

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        aria-label="메뉴 열기"
        aria-expanded={open}
        className="flex size-10 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-line text-[17px] text-n400 hover:border-accent hover:text-accent lg:hidden"
      >
        ☰
      </button>

      {/*
       * **오버레이는 `document.body`에 그린다** (#729 · ssccops#545).
       *
       * 이 컴포넌트는 상단 바(`SiteHeader`) 안에 있고, 그 헤더에는 `backdrop-filter`가 걸려 있다(#721).
       * `backdrop-filter`·`transform`·`filter`는 그 요소를 **`position: fixed` 자손의 기준 상자**로
       * 만든다 — 그래서 `fixed inset-0`이 화면이 아니라 64px짜리 헤더에 맞춰 잡혔고, prod 모바일에서
       * «메뉴 ×» 머리만 뜨고 목차 13줄이 그 상자 안에서 잘렸다(v1.0.0 · 2026-09-29~30).
       *
       * 흐림을 걷어도 고쳐지지만 헤더에 `transform`·`filter`가 다시 들어오는 순간 **조용히** 돌아온다 —
       * 포털로 기준 상자에서 벗어나면 헤더를 어떻게 꾸미든 깨지지 않는다. ☰ 버튼은 헤더에 남는다.
       *
       * `open`이 브라우저 상태라 서버 렌더에는 이 가지가 없다 — `document`를 읽어도 SSR이 깨지지 않는다.
       */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[80] lg:hidden">
            {/*
              스크림 — 클릭으로 닫히지만 키보드로 «누르는» 대상이 아니다. Esc는 위 effect가
              document에서 받는다. 보조기기에서는 치운다 (ssccops-web#403 · Sheet와 같은 판단).
            */}
            <div
              aria-hidden="true"
              onClick={() => setOpen(false)}
              // 스크림·경계 색은 토큰이다(#575) — `bg-black/40`은 다크에서 그 자리만 밝게 남는다
              className="absolute inset-0 animate-fade-in bg-scrim motion-reduce:animate-none"
            />
            <div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="메뉴"
              className="absolute inset-y-0 left-0 flex w-[78%] max-w-[280px] flex-col border-r border-hairline-strong bg-surface pt-[22px] pb-4 outline-none"
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
              <div className="flex flex-1 flex-col overflow-y-auto [overscroll-behavior:contain]">
                {/*
                 * 하위가 있는 축은 **접고 펼친다** (#731 · ssccops#533 · ADR-0056 추신).
                 *
                 * #712에서는 축 다섯 · 하위 여덟을 펼친 채 그렸다 — 접으면 «지금 무엇이 접혀 있나»와
                 * 그것을 기억할지가 따라오고, 그 상태가 #524가 드롭다운을 기각했던 근거였다. 써 보니
                 * 펼친 채로는 산만했다(2026-09-30). 그래서 **기억하지 않는 아코디언**이다 — 드로어를
                 * 열 때마다 지금 화면이 속한 축만 펼쳐지고, localStorage도 URL도 없다. 드로어는
                 * 잠깐 열었다 닫는 자리라 기억할 값이 아니고, 기억하지 않으면 «상태를 저장할지»라는
                 * 결정 자체가 사라진다. 어드민 사이드바(`use-nav-accordion.ts` · #635)가 기억하는 것은
                 * 늘 떠 있는 목차라서다.
                 *
                 * **축 머리는 토글이지 이동이 아니다.** 축 주소(`/about`·`/join`)는 하위 첫 줄(«소개»·
                 * «안내»)이 같은 곳으로 가므로 잃는 길이 없고, 한 줄에 링크와 ▾ 버튼을 나란히 두면
                 * 좁은 화면에서 누를 자리가 둘로 쪼개진다.
                 */}
                <nav aria-label="주 메뉴" className="flex flex-col px-[10px]">
                  {NAV_LINKS.map((link) => {
                    const active = link.isActive(pathname);
                    const hasChildren = Boolean(link.children?.length);
                    const isOpen = expanded.has(link.href);
                    const panelId = `mnav-${link.href.replaceAll("/", "")}`;
                    // 하위가 있는 축의 «켜짐»은 «이 축 안에 있다»이지 «이 페이지다»가 아니다 —
                    // 지금 화면은 아래 줄 중 하나가 말한다. 같은 칠을 둘에 하면 어느 쪽이 현재
                    // 위치인지 흐려진다
                    const axisFill = active && !hasChildren;
                    const axisClass = axisFill
                      ? "rounded-[10px] bg-accent-soft px-[12px] py-[11px] text-[15px] font-semibold text-accent"
                      : active
                        ? "rounded-[10px] px-[12px] py-[11px] text-[15px] font-semibold text-ink"
                        : "rounded-[10px] px-[12px] py-[11px] text-[15px] text-ink hover:bg-bg";
                    return (
                      <div key={link.href} className="flex flex-col">
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleAxis(link.href)}
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            className={`flex cursor-pointer items-center justify-between text-left ${axisClass}`}
                          >
                            {link.label}
                            <span
                              aria-hidden="true"
                              className={`text-[11px] text-n400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                            >
                              ▾
                            </span>
                          </button>
                        ) : (
                          <Link
                            href={link.href}
                            // 이동하면 닫는다 — 열린 드로어가 새 화면을 덮은 채 남지 않게 한다.
                            // 경로 변화를 effect로 감시하지 않고 클릭에서 닫는 것은, 상태 변경을
                            // 렌더 뒤 effect에 미루면 한 프레임 열린 채 그려지기 때문이다(react-hooks 규칙).
                            onClick={() => setOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={axisClass}
                          >
                            {link.label}
                          </Link>
                        )}
                        {hasChildren && isOpen ? (
                          <div
                            id={panelId}
                            className="mt-[2px] mb-[6px] ml-[20px] flex flex-col border-l border-line pl-[8px]"
                          >
                            {(link.children ?? []).map((child) => {
                              const on = child.isActive(pathname);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={() => setOpen(false)}
                                  aria-current={on ? "page" : undefined}
                                  className={
                                    on
                                      ? "rounded-[8px] bg-accent-soft px-[12px] py-[9px] text-[14px] font-semibold text-accent"
                                      : "rounded-[8px] px-[12px] py-[9px] text-[14px] text-n300 hover:bg-bg hover:text-ink"
                                  }
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </nav>

                {/*
                 * 계정 절은 목차 아래 발치 — `mt-auto`로 아래에 붙이는 것은 목차(축 다섯 + 하위)가
                 * 끝난 바로 밑에 떠 있지 않게 하려는 것이다. 판정 전(null)은 아무것도 그리지 않는다.
                 */}
                <div className="mt-auto px-[10px] pt-4">
                  {signedIn === true && (
                    <AccountSections
                      links={ACCOUNT_LINKS}
                      apps={accountApps()}
                      install={<InstallMenuItem />}
                      onSignOut={() => void signOut()}
                      signingOut={signingOut}
                      onNavigate={(href) => router.push(href)}
                      onSelect={() => setOpen(false)}
                      pathname={pathname}
                    />
                  )}
                  {signedIn === false && (
                    <div className="px-[8px]">
                      <SignInButton variant="ghost" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
