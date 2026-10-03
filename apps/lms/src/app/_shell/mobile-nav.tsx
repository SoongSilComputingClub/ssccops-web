"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InstallMenuItem } from "@ssccops/pwa/ui";
import { AccountSections, useFocusTrap } from "@ssccops/ui";
import { ACCOUNT_LINKS, SignInButton, accountApps, useAuthSession } from "@/features/auth";
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
 * ── ☰은 왼쪽, 드로어도 왼쪽에서 (#614 · ssccops#452) ─────────
 * 세 앱의 모바일 상단 바가 `[☰] [브랜드] ──── [종] [아바타]` 한 모양이다(어드민이 원래 이 모양).
 * 발치는 계정 절(`AccountSections` — 내 정보·테마·홈페이지·홈 화면에 추가·로그아웃)이고 상단 바의
 * 계정 메뉴와 같은 항목을 받는다. 로그인 전이면 «로그인» 하나. «내 정보»·«홈페이지 ↗»·설치 항목·
 * 테마 라디오가 발치에 따로 서 있던 것을 그 절이 흡수했다.
 *
 * 열렸을 때 본문 스크롤을 잠그고, ESC·바깥 클릭·항목 이동으로 닫는 규약도 어드민과 같다.
 */
export function MobileNav({ isLeader }: Readonly<{ isLeader: boolean }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { signedIn, signOut, signingOut } = useAuthSession();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDialogElement>(null);

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
        onClick={() => setOpen(true)}
        aria-label="메뉴 열기"
        aria-expanded={open}
        className="flex size-10 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-line text-[17px] text-n400 hover:border-accent hover:text-accent lg:hidden"
      >
        ☰
      </button>

      {/*
       * **오버레이는 `document.body`에 그린다** (#733 · ssccops#535 · ssccops#545).
       *
       * 이 컴포넌트는 상단 바(`app/layout.tsx`의 `<header>`) 안에 있다. 그 조상에 `backdrop-filter`·`transform`·`filter`가
       * 걸리면 조상이 **`position: fixed` 자손의 기준 상자**가 되어 `fixed inset-0`이 화면이 아니라
       * 그 조상 크기에 갇힌다 — v1.0.0에서 www 모바일 메뉴가 그렇게 64px에 갇혀 열리지 않았다(#729).
       * 지금 이 앱의 상단 바에는 그런 속성이 없지만 ssccops#535가 www의 고정 헤더(흐림 포함)를 이 앱에
       * 가져간다 — 그 전에 기준 상자에서 벗어나 둔다. `open`이 브라우저 상태라 서버 렌더에는 이 가지가 없다.
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
              className="absolute inset-0 animate-fade-in bg-scrim motion-reduce:animate-none"
            />
            {/*
              `role="dialog"`을 붙인 div가 아니라 `<dialog>`다 (#759 · S6819) — Sheet와 같은 판단이다.
              **`open` 속성만 쓰고 `showModal()`은 쓰지 않는다**: 최상위 레이어로 올라가면 위의
              스크림·`z-[80]`이 뜻을 잃는다. 여는 조건은 위의 `open &&` 그대로다.

              브라우저 기본 스타일 중 Tailwind preflight가 되돌리지 않는 둘을 맞춘다 — `height:
              fit-content`는 `h-auto`로(그대로 두면 `inset-y-0`이 화면 높이를 채우지 못한다),
              `color: CanvasText`는 `text-[color:inherit]`로. 여백·테두리는 preflight가 이미 지운다.
            */}
            <dialog
              ref={panelRef}
              open
              tabIndex={-1}
              aria-modal="true"
              aria-label="메뉴"
              className="absolute inset-y-0 left-0 flex h-auto w-[78%] max-w-[280px] flex-col border-r border-hairline-strong bg-surface pt-[22px] pb-4 text-[color:inherit] outline-none"
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
                <nav aria-label="주 메뉴" className="flex flex-col gap-[14px] px-[10px]">
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
                 * 계정 절은 목차 아래 발치 — `mt-auto`로 아래에 붙이는 것은 목차가 짧은 일반 회원
                 * (항목 둘)의 드로어에서 메뉴 바로 밑에 떠 있지 않게 하려는 것이다. 판정 전(null)은
                 * 아무것도 그리지 않는다 — 판정은 하이드레이션 직후 끝난다.
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
            </dialog>
          </div>,
          document.body,
        )}
    </>
  );
}
