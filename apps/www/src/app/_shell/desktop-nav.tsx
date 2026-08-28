"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "./nav-links";

/**
 * 데스크톱 상단 바 메뉴 (lg 이상, #167).
 *
 * `"use client"`인 것은 현재 경로로 활성 항목을 켜기 위해서다(`usePathname`). 세션은 보지
 * 않으므로 익명 공개 렌더에 서버 왕복을 더하지 않는다 — 이 앱이 클라이언트 컴포넌트를 허용하는
 * 기준("로그인 상태를 쥐어야 하는가")과는 별개로, 경로 하나 읽는 비용은 이 앱의 원칙을 건드리지
 * 않는다.
 */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="주 메뉴" className="hidden items-center gap-[2px] lg:flex">
      {NAV_LINKS.map((link) => {
        const active = link.isActive(pathname);
        return (
          <Link
            key={link.href}
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
