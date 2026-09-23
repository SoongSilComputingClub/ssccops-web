"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GroupIcon } from "@ssccops/ui";
import { capabilityLabel, useSessionStore, type MemberProfile } from "@/entities/session";
import { cn } from "@/shared/lib/cn";
import { ROUTES } from "@/shared/config/routes";
import { Card, PageBody, PageHeader } from "@/shared/ui";
import { itemAllowed, NAV_GROUPS, type NavItem } from "./nav";

/*
 * 전체 메뉴 `/sitemap` (#635 · ssccops#462) — 목차(`nav.ts`)를 묶음별 카드로 **전부** 펼친다.
 *
 * 사이드바는 권한 없는 항목을 감춘다(«이동은 감추고, 동작은 잠근다» · use-can.ts). 그래서 «그 화면이
 * 있기는 한가»를 알 자리가 없었다 — 여기서는 감추지 않고 잠금 표시 + 필요한 권한명을 붙인다. 권한을
 * 요청하러 갈 때 무엇을 달라고 할지 이 화면이 말해 준다(문구 규칙 «요구 권한은 이름으로»).
 *
 * `views/`가 아니라 `_shell/`에 있는 것은 FSD가 위→아래 한 방향이라 `views`가 `app/(admin)/_shell/nav.ts`를
 * 가져올 수 없어서다. 목차를 `features`로 내리는 것보다 «셸이 자기 목차를 한 장으로 보여 주는 화면»으로
 * 셸 옆에 두는 편이 정직하다 — 라우트 `app/(admin)/sitemap/page.tsx`가 이것을 얇게 감싼다.
 */

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="flex-none">
      <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function SitemapItem({
  item,
  member,
  pathname,
  child,
}: Readonly<{
  item: NavItem;
  member: MemberProfile | null;
  pathname: string;
  child?: boolean;
}>) {
  const allowed = itemAllowed(member, item);
  const active = item.isActive(pathname);
  return (
    <>
      <li className={cn("flex min-h-[40px] items-center gap-2 py-1", child && "pl-5")}>
        {child && <span aria-hidden="true" className="size-[5px] flex-none rounded-full bg-line-strong" />}
        {allowed ? (
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
        ) : (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-[2px] text-n500">
            <span className="flex items-center gap-1 text-[15px]">
              <LockIcon />
              {item.label}
            </span>
            {item.requires && (
              <span className="text-[12.5px]">필요한 권한: {capabilityLabel(item.requires)}</span>
            )}
          </div>
        )}
      </li>
      {item.children?.map((k) => (
        <SitemapItem key={k.href} item={k} member={member} pathname={pathname} child />
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

  return (
    <>
      <PageHeader title="전체 메뉴" subtitle="이 앱의 모든 화면" />
      <PageBody>
        <p className="mb-4 text-[14px] leading-[1.6] text-n500">
          권한이 없는 화면은 잠금으로 표시되고 필요한 권한이 함께 적혀 있습니다. 권한은 역할에 따라
          정해집니다.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {NAV_GROUPS.map((g) => (
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
                    <SitemapItem item={item} member={member} pathname={pathname} />
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
