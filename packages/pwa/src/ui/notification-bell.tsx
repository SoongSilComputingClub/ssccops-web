"use client";

import Link from "next/link";
import { useUnreadCount } from "../unread-store";

/**
 * 종 — 안 읽은 알림 수 배지 + 알림 목록 링크 (#671 · www #616 · lms #606 · ssccops#453).
 *
 * 두 앱이 글자까지 같은 것을 48·47줄로 갖고 있었다. 갈리는 것은 그 앱의 `/notifications` 경로
 * (`ROUTES.notifications`)뿐이라 `href`로 받는다 — 이 패키지는 앱의 라우트 표를 모른다.
 *
 * 값은 이 패키지의 모듈 스토어에서만 읽는다(듣는 것은 `useUnreadCountSync` 하나). 아직 못 들었거나
 * 0이면 배지가 없다. 드롭다운을 두지 않고 페이지로 보내는 것은 모바일에서 읽음 처리·더 보기가
 * 드롭다운에 비좁아서다. 크기·테두리는 옆의 드로어 버튼(☰)과 같다.
 *
 * admin(#604)은 종이 사이드바·상단 바 두 자리에 있고 값도 자기 zustand 스토어라 아직 사본을 쓴다 —
 * 스토어를 이 패키지 것으로 바꾸는 작업에서 함께 옮긴다(`README.md` «앱이 할 일» 3).
 */
export function NotificationBell({ href }: Readonly<{ href: string }>) {
  const unreadCount = useUnreadCount();
  const count = unreadCount ?? 0;
  const label = count > 0 ? `알림 ${count}건 안 읽음` : "알림";

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="relative flex size-10 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-line text-n400 hover:border-accent hover:text-accent"
    >
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
