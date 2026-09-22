"use client";

import Link from "next/link";
import { useUnreadStore } from "@/entities/notification";
import { ROUTES } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";

/**
 * 종 — 안 읽은 알림 수 배지 + `/notifications` 링크 (#604 · ssccops#447). 유틸리티 묶음에서 계정 메뉴 밖에 남는 유일한 것이다(#614 · ssccops#452) — md(40px)는 상단 바, sm은 사이드바 발치·레일.
 *
 * 값은 스토어에서만 읽는다(듣는 것은 `UnreadCountSync` 하나). 아직 못 들었거나 0이면 배지가 없다.
 * 드롭다운을 두지 않고 페이지로 보내는 것은 모바일에서 읽음 처리·더 보기가 드롭다운에 비좁아서다.
 */
export function NotificationBell({ size = "md" }: Readonly<{ size?: "md" | "sm" }>) {
  const unreadCount = useUnreadStore((s) => s.unreadCount);
  const count = unreadCount ?? 0;
  const label = count > 0 ? `알림 ${count}건 안 읽음` : "알림";
  const icon = size === "md" ? 18 : 15;

  return (
    <Link
      href={ROUTES.notifications}
      aria-label={label}
      title={label}
      className={cn(
        "relative flex flex-none cursor-pointer items-center justify-center rounded-[10px] border border-line text-n400 hover:border-accent hover:text-accent",
        size === "md" ? "size-10" : "size-7",
      )}
    >
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M10 20a2 2 0 0 0 4 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -top-[6px] -right-[6px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold text-on-solid">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
