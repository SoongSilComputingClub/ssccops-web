"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GroupIcon } from "@ssccops/ui";
import { useSessionStore } from "@/entities/session";
import { cn } from "@/shared/lib/cn";
import { ROUTES } from "@/shared/config/routes";
import { Card, PageBody, PageHeader } from "@/shared/ui";
import { NAV_GROUPS, visibleGroups, type NavItem } from "./nav";

/*
 * 전체 메뉴 `/sitemap` (#635 · ssccops#462) — 목차(`nav.ts`)를 묶음별 카드로 한 장에 펼친다. 접힌
 * 아코디언을 열지 않고 «이 앱에서 내가 갈 수 있는 곳»을 한눈에 보는 자리다.
 *
 * ⚠️ 2026-10-18 정정(#809 · ssccops#611): 여기는 «감추지 않고 잠금 표시 + 필요한 권한명을 붙인다 —
 * 그 화면이 있기는 한가를 알 자리»였다. 그 자리가 스터디장 계정에 «학술 대시보드 · 필요한 권한: 학술
 * 프로그램 관리(ACADEMIC_PROGRAM_MANAGE)»를 보여 줬다 — 리더는 운영진이 아니라 그런 화면이 있다는
 * 것조차 몰라야 한다(사용자 결정). 그래서 **사이드바와 같은 `visibleGroups`로 거른다** — 목차와 전체
 * 메뉴가 같은 것을 말한다. 권한이 하나도 없는 회원은 이 화면에 오지도 않는다(AdminAccessGate).
 *
 * `views/`가 아니라 `_shell/`에 있는 것은 FSD가 위→아래 한 방향이라 `views`가 `app/(admin)/_shell/nav.ts`를
 * 가져올 수 없어서다. 목차를 `features`로 내리는 것보다 «셸이 자기 목차를 한 장으로 보여 주는 화면»으로
 * 셸 옆에 두는 편이 정직하다 — 라우트 `app/(admin)/sitemap/page.tsx`가 이것을 얇게 감싼다.
 */

function SitemapItem({
  item,
  pathname,
  child,
}: Readonly<{
  item: NavItem;
  pathname: string;
  child?: boolean;
}>) {
  const active = item.isActive(pathname);
  return (
    <>
      <li className={cn("flex min-h-[40px] items-center gap-2 py-1", child && "pl-5")}>
        {child && <span aria-hidden="true" className="size-[5px] flex-none rounded-full bg-line-strong" />}
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "rounded-[6px] text-[15px] underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent/40",
            active ? "font-medium text-accent-strong" : "text-ink",
          )}
        >
          {item.label}
        </Link>
      </li>
      {item.children?.map((k) => (
        <SitemapItem key={k.href} item={k} pathname={pathname} child />
      ))}
    </>
  );
}

const ACCOUNT_PAGES = [
  { label: "내 정보", href: ROUTES.my },
  { label: "알림", href: ROUTES.notifications },
] as const;

export function SitemapPage() {
  const member = useSessionStore((s) => s.member);
  const pathname = usePathname();
  // 사이드바와 같은 필터 — 볼 수 없는 항목은 이 화면에도 없다 (#809)
  const groups = visibleGroups(NAV_GROUPS, member);

  return (
    <>
      <PageHeader title="전체 메뉴" subtitle="열 수 있는 화면" />
      <PageBody>
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((g) => (
            <Card key={g.id} className="flex flex-col">
              <h2 className="mb-2 flex items-center gap-2 text-[17px] font-medium">
                <GroupIcon emoji={g.emoji} size={26} />
                {g.label}
              </h2>
              <ul>
                {g.items.map((item, i) => (
                  <Fragment key={item.href}>
                    {item.section && item.section !== g.items[i - 1]?.section && (
                      <li className="pt-[8px] pb-[2px] text-[12px] font-semibold tracking-[.3px] text-n500">
                        {item.section}
                      </li>
                    )}
                    <SitemapItem item={item} pathname={pathname} />
                  </Fragment>
                ))}
              </ul>
            </Card>
          ))}
          {/* 목차 밖의 화면 — 계정 메뉴와 종이 여는 곳. 여기 없으면 «전체»가 아니다 */}
          <Card className="flex flex-col">
            <h2 className="mb-2 text-[17px] font-medium">계정</h2>
            <ul>
              {ACCOUNT_PAGES.map((page) => (
                <li key={page.href} className="flex min-h-[40px] items-center py-1">
                  <Link
                    href={page.href}
                    aria-current={pathname.startsWith(page.href) ? "page" : undefined}
                    className="rounded-[6px] text-[15px] text-ink underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
