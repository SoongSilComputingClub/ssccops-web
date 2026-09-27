"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_LINKS, type NavLink } from "./nav-links";

/**
 * 데스크톱 상단 바 메뉴 (lg 이상, #167).
 *
 * `"use client"`인 것은 현재 경로로 활성 항목을 켜기 위해서다(`usePathname`). 세션은 보지
 * 않으므로 익명 공개 렌더에 서버 왕복을 더하지 않는다 — 이 앱이 클라이언트 컴포넌트를 허용하는
 * 기준("로그인 상태를 쥐어야 하는가")과는 별개로, 경로 하나 읽는 비용은 이 앱의 원칙을 건드리지
 * 않는다.
 *
 * **1차 메뉴뿐이다** (#614 · ssccops#452). «LMS ↗»가 이 줄 끝에 서 있었는데(#577) 다른 앱은 계정
 * 메뉴 절 ④의 자리다 — 로그인한 부원에게는 거기, 누구에게나는 푸터(`site-footer.tsx`)에 있다.
 *
 * ── 하위가 있는 축은 ▾로 연다 (#712 · ssccops#533 · ADR-0056) ─────────
 * **hover만으로 열지 않는다.** ▾ 표식이 늘 보이고, 마우스를 올려도 열리지만 ▾ 버튼을
 * 클릭하거나 키보드로 Enter·Space를 눌러도 열린다(`aria-expanded`·`aria-haspopup`). 축 이름
 * 자체는 여전히 갈 수 있는 링크다 — «소개»를 누르면 `/about`이다. 마우스가 없는 사람에게 길이
 * 없으면 2단을 드러낸 뜻이 없어진다.
 *
 * 닫는 길은 넷이다: Esc · 바깥 포인터 · 묶음 밖으로 포커스 이동 · 경로 변화. 마지막 것이 있어야
 * 드롭다운 안의 링크로 이동한 뒤 메뉴가 새 화면 위에 남지 않는다.
 *
 * 한 번에 하나만 열린다(`openHref`) — 둘이 겹쳐 뜨면 어느 축의 하위인지 읽을 수 없다.
 */
export function DesktopNav() {
  const pathname = usePathname();
  /*
   * «어느 축이 열렸나»가 아니라 «어느 축을 **어느 화면에서** 열었나»를 쥔다. 그래서 경로가
   * 바뀌면 열린 상태가 렌더 중에 저절로 사라진다 — 드롭다운 링크가 `<Link>`라 클릭과 이동이 한
   * 프레임에 끝나지 않는데, 이것을 effect에서 `setState`로 닫으면 한 프레임 열린 채 그려지고
   * `react-hooks/set-state-in-effect`에도 걸린다.
   */
  const [opened, setOpened] = useState<{ href: string; at: string } | null>(null);
  const openHref = opened?.at === pathname ? opened.href : null;
  const setOpenHref = (href: string | null) =>
    setOpened(href ? { href, at: pathname } : null);

  return (
    <nav aria-label="주 메뉴" className="hidden items-center gap-[2px] lg:flex">
      {NAV_LINKS.map((link) =>
        link.children?.length ? (
          <NavAxis
            key={link.href}
            link={link}
            active={link.isActive(pathname)}
            pathname={pathname}
            open={openHref === link.href}
            setOpen={(next) => setOpenHref(next ? link.href : null)}
          />
        ) : (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.isActive(pathname) ? "page" : undefined}
            className={link.isActive(pathname) ? AXIS_ACTIVE : AXIS_IDLE}
          >
            {link.label}
          </Link>
        ),
      )}
    </nav>
  );
}

const AXIS_BASE = "rounded-lg px-[10px] py-[6px] text-[14.5px]";
const AXIS_ACTIVE = `${AXIS_BASE} font-semibold text-ink`;
const AXIS_IDLE = `${AXIS_BASE} text-n300 hover:text-ink`;

function NavAxis({
  link,
  active,
  pathname,
  open,
  setOpen,
}: {
  link: NavLink;
  active: boolean;
  pathname: string;
  open: boolean;
  setOpen: (next: boolean) => void;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const menuId = `nav-${link.href.replaceAll("/", "")}`;

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // 바깥을 누르면 닫는다 — 마우스는 아래 `onMouseLeave`가 받지만, ▾로 열어 둔 채 다른 곳을
    // 누르는 경우는 그것으로 닫히지 않는다
    const onPointerDown = (e: PointerEvent) => {
      if (!groupRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, setOpen]);

  return (
    <div
      ref={groupRef}
      className="relative flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      // 묶음 밖으로 포커스가 나가면 닫는다 — 키보드로 연 메뉴가 Tab으로 빠져나간 뒤 남지 않게
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Link
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={`${active ? AXIS_ACTIVE : AXIS_IDLE} pr-[4px]`}
      >
        {link.label}
      </Link>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        aria-label={`${link.label} 하위 메뉴`}
        className={`flex size-[22px] cursor-pointer items-center justify-center rounded-md text-[10px] ${
          active ? "text-ink" : "text-n400 hover:text-ink"
        }`}
      >
        <span aria-hidden="true" className={open ? "rotate-180" : undefined}>
          ▾
        </span>
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute top-full left-0 z-[70] flex w-[168px] flex-col rounded-[12px] border border-line bg-surface p-1 shadow-lg"
        >
          {link.children?.map((child) => {
            const on = child.isActive(pathname);
            return (
              <Link
                key={child.href}
                href={child.href}
                aria-current={on ? "page" : undefined}
                className={
                  on
                    ? "rounded-[8px] bg-accent-soft px-[10px] py-[8px] text-[14px] font-semibold text-accent"
                    : "rounded-[8px] px-[10px] py-[8px] text-[14px] text-n300 hover:bg-bg hover:text-ink"
                }
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
