"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "./nav-links";

/**
 * 데스크톱 상단 바 메뉴 (lg 이상, #169).
 *
 * `"use client"`인 것은 현재 경로로 활성 항목을 켜기 위해서다(`usePathname`). apps/www의 같은
 * 컴포넌트와 뼈대가 같다.
 *
 * **역할별 필터링은 아직 없다.** 지금은 `NAV_LINKS` 전부를 그린다 — 세션에서 역할을 읽어
 * 스터디장/일반회원 묶음을 나누는 것은 화면 이슈들이 붙인다(`nav-links.ts`의 `role` 필드가
 * 그 자리를 미리 잡아 두었다).
 */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="주 메뉴" className="hidden items-center gap-[2px] lg:flex">
      {NAV_LINKS.map((link) => {
        const active = link.isActive(pathname);
        return (
          <Link
            key={link.label}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-lg px-[10px] py-[6px] text-[14.5px] font-semibold text-ink"
                : "rounded-lg px-[10px] py-[6px] text-[14.5px] text-n300 hover:text-ink"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
