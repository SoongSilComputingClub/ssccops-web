"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { InstallMenuItem } from "@ssccops/pwa/ui";
import { AccountSections } from "@ssccops/ui";
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
        className="flex size-10 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-line text-[17px] text-n400 hover:border-accent hover:text-accent lg:hidden"
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

              {/*
               * 계정 절은 목차 아래 발치 — `mt-auto`로 아래에 붙이는 것은 목차(일곱 항목)가 끝난
               * 바로 밑에 떠 있지 않게 하려는 것이다. 판정 전(null)은 아무것도 그리지 않는다.
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
        </div>
      )}
    </>
  );
}
