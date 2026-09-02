"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { visibleNavLinks } from "./nav-links";

/**
 * 데스크톱 상단 바 메뉴 (lg 이상, #169).
 *
 * `"use client"`인 것은 현재 경로로 활성 항목을 켜기 위해서다(`usePathname`). apps/www의 같은
 * 컴포넌트와 뼈대가 같다.
 *
 * **역할별 필터링은 `isLeader` prop이 한다** (#224). 판정은 루트 레이아웃이 서버에서 한 번 해
 * 내려보낸다 — 여기서 직접 조회하면 `authed-client`(`next/headers`)가 클라이언트 번들로 끌려와
 * 빌드가 깨지고, 드로어까지 각자 조회하면 같은 요청이 두 번 나간다.
 */
export function DesktopNav({ isLeader }: { isLeader: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="주 메뉴" className="hidden items-center gap-[2px] lg:flex">
      {visibleNavLinks(isLeader).map((link) => {
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
