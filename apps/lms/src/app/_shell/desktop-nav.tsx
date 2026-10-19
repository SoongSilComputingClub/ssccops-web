"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeGroup, hrefOf, visibleNavGroups } from "./nav-links";

/**
 * 데스크톱 상단 바 메뉴 (lg 이상, #169).
 *
 * `"use client"`인 것은 현재 경로로 활성 항목을 켜기 위해서다(`usePathname`). apps/www의 같은
 * 컴포넌트와 뼈대가 같다.
 *
 * **상단 바에는 묶음만 선다** — 그 안의 항목은 `SectionTabs`가 화면 위 탭줄로 그린다. 여덟
 * 항목이 한 줄에 서면서 좁은 데스크톱에서 라벨이 두 줄로 접히던 것을 이렇게 나눴다.
 * 누르면 그 묶음의 첫 항목으로 간다(`hrefOf`) — 드롭다운을 열지 않는다(`nav-links.ts` 주석).
 *
 * **역할별 필터링은 `isLeader` prop이 한다** (#224). 판정은 루트 레이아웃이 서버에서 한 번 해
 * 내려보낸다 — 여기서 직접 조회하면 `authed-client`(`next/headers`)가 클라이언트 번들로 끌려와
 * 빌드가 깨지고, 드로어까지 각자 조회하면 같은 요청이 두 번 나간다.
 */
export function DesktopNav({ isLeader }: Readonly<{ isLeader: boolean }>) {
  const pathname = usePathname();
  const groups = visibleNavGroups(isLeader);
  const current = activeGroup(groups, pathname);

  return (
    <nav aria-label="주 메뉴" className="hidden items-center gap-[2px] lg:flex">
      {groups.map((group) => {
        const active = group === current;
        return (
          <Link
            key={group.label}
            href={hrefOf(group)}
            aria-current={active ? "page" : undefined}
            className={active ? AXIS_ACTIVE : AXIS_IDLE}
          >
            {group.label}
          </Link>
        );
      })}
    </nav>
  );
}

/*
 * hover와 active가 같아 보이지 않게 한다 — www 상단 바와 같은 어휘(#798 · ssccops#535 · www #721).
 * hover는 옅은 면(`bg-bg`), 켜진 묶음은 `accent-soft` 위 `accent`. 드로어 줄도 이미 이 모양이다.
 */
const AXIS_BASE = "rounded-lg px-[10px] py-[6px] text-[14.5px] whitespace-nowrap";
const AXIS_ACTIVE = `${AXIS_BASE} bg-accent-soft font-semibold text-accent`;
const AXIS_IDLE = `${AXIS_BASE} text-n300 hover:bg-bg hover:text-ink`;
