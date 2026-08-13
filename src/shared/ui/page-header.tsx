"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";

/** 페이지 상단 헤더 — 타이틀/서브타이틀/뒤로가기/주요 액션 */
export function PageHeader({
  title,
  subtitle,
  showBack,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  showBack?: boolean;
  action?: { label: string; onClick: () => void };
}) {
  const router = useRouter();
  return (
    <div className="flex flex-none items-center gap-[14px] border-b border-black/8 bg-gradient-to-b from-white to-bg px-8 py-5">
      {showBack && (
        <button
          type="button"
          onClick={() => router.back()}
          className="flex size-8 flex-none cursor-pointer items-center justify-center rounded-[12px] border border-line text-n300 hover:border-accent hover:text-accent"
        >
          <svg width="9" height="16" viewBox="0 0 9 16" fill="none">
            <path
              d="M7.5 1L1.5 8l6 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[24px] font-medium tracking-[-.3px]">{title}</div>
        {subtitle && <div className="mt-[2px] text-[13.5px] text-n500">{subtitle}</div>}
      </div>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}

/** 스크롤 본문 래퍼 (max-width 1000px) */
export function PageBody({
  children,
  maxWidth = 1000,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-8 pt-6 pb-[60px]">
      <div style={{ maxWidth }}>{children}</div>
    </div>
  );
}
