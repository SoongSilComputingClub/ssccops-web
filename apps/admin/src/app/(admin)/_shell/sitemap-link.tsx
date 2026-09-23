import Link from "next/link";
import type { MouseEvent } from "react";
import { cn } from "@/shared/lib/cn";
import { ROUTES } from "@/shared/config/routes";
import { NAV_FOCUS } from "./nav-panel";

/**
 * 사이드바·드로어 발치의 «전체 메뉴» (#635 · ssccops#462) — 권한 때문에 목차에서 감춰진 화면까지
 * 한 장에 보는 `/sitemap`으로 간다. 목차 행과 달리 진짜 링크다(Cmd/Ctrl·가운데 클릭이 새 탭으로) —
 * 수식키 없는 왼쪽 클릭만 `onNavigate`로 보내 드로어가 닫히게 한다(`AccountMenu`의 링크와 같은 규칙).
 */
export function SitemapLink({
  pathname,
  onNavigate,
  className,
}: Readonly<{
  pathname: string;
  onNavigate: (href: string) => void;
  className?: string;
}>) {
  const active = pathname.startsWith(ROUTES.sitemap);
  const onClick = (ev: MouseEvent<HTMLAnchorElement>) => {
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    onNavigate(ROUTES.sitemap);
  };
  return (
    <Link
      href={ROUTES.sitemap}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "flex min-h-[40px] touch-manipulation items-center gap-[9px] px-[18px] py-[8px] text-[14px] hover:bg-accent/6",
        NAV_FOCUS,
        active ? "text-accent-strong" : "text-n400",
        className,
      )}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" className="flex-none">
        <path
          d="M4 6.5h14M4 11h14M4 15.5h14"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      전체 메뉴
    </Link>
  );
}
