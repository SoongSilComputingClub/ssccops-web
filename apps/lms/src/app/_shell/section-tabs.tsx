"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeGroup, visibleNavGroups } from "./nav-links";

/**
 * 지금 묶음의 하위 탭줄 — 본문 맨 위에 선다.
 *
 * 상단 바가 «어느 묶음인가»를, 이 줄이 «그 묶음의 어느 화면인가»를 말한다. 둘 다
 * `nav-links.ts` 한 벌을 보므로 판정이 갈리지 않는다(`activeGroup`을 상단 바와 함께 쓴다).
 *
 * ── 안 그리는 경우가 둘이다 ─────────────────────────────────
 *  1. 목차에 없는 화면(로그인 오류 등) — `activeGroup`이 `undefined`다.
 *  2. 항목이 하나뿐인 묶음(학술 대시보드) — 고를 것이 없는 탭줄은 자리만 차지한다.
 *     일반 회원의 «모집·기획»도 탭이 둘이라 그려진다(기획안 제출·제출 현황).
 *
 * 좁은 화면에서는 가로로 스크롤한다 — 탭을 접어 드롭다운으로 만들면 지금 어디인지가
 * 한 번 더 눌러야 보인다(출석부 행렬이 카드 대신 가로 스크롤을 고른 것과 같은 판단 · #172).
 * 스크롤바는 감추되 스크롤 자체는 살린다.
 */
export function SectionTabs({ isLeader }: Readonly<{ isLeader: boolean }>) {
  const pathname = usePathname();
  const groups = visibleNavGroups(isLeader);
  const current = activeGroup(groups, pathname);

  if (!current || current.links.length < 2) return null;

  return (
    <nav
      aria-label={`${current.label} 화면`}
      className="mb-[18px] flex gap-[2px] overflow-x-auto border-b border-hairline [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {current.links.map((link) => {
        const active = link.isActive(pathname);
        return (
          <Link
            key={link.label}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "-mb-px border-b-2 border-accent px-[12px] py-[10px] text-[14.5px] font-semibold whitespace-nowrap text-accent"
                : "-mb-px border-b-2 border-transparent px-[12px] py-[10px] text-[14.5px] whitespace-nowrap text-n300 hover:text-ink"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
