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
}: Readonly<{
  title: ReactNode;
  subtitle?: ReactNode;
  showBack?: boolean;
  /**
   * 주요 액션. `disabled`와 `title`은 권한이 없을 때 쓴다 (#29) — 감추지 않고 잠근 채
   * 이유를 툴팁으로 붙인다. 근거는 features/auth/model/use-can.ts.
   */
  action?: { label: string; onClick: () => void; disabled?: boolean; title?: string };
}>) {
  const router = useRouter();
  return (
    // 좌우 여백은 상단 바(mobile-nav)와 같은 px-4 — 375에서 본문 폭 311px이던 것을 343px로 (UI 감사 D15 · #470)
    <div className="flex flex-none items-center gap-[14px] border-b border-hairline-strong bg-gradient-to-b from-surface to-bg px-4 py-5 lg:px-8">
      {showBack && (
        <button
          type="button"
          onClick={() => router.back()}
          // 아이콘뿐인 버튼은 이름이 없으면 보조기기에 «버튼»으로만 읽힌다 — 23화면에서 유일한 이름 없는 버튼이었다 (UI 감사 D4)
          aria-label="뒤로"
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
        {/* 화면의 제목은 h1 — admin 전체에 h1이 없어 보조기기의 «제목으로 이동»이 죽어 있었다 (UI 감사 D14) */}
        <h1 className="text-[24px] font-medium tracking-[-.3px]">{title}</h1>
        {subtitle && <div className="mt-[2px] text-[13.5px] text-n500">{subtitle}</div>}
      </div>
      {action && (
        <Button onClick={action.onClick} disabled={action.disabled} title={action.title}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

/** 스크롤 본문 래퍼 (max-width 1000px) */
export function PageBody({
  children,
  maxWidth = 1000,
}: Readonly<{
  children: ReactNode;
  maxWidth?: number;
}>) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-[60px] lg:px-8">
      <div style={{ maxWidth }}>{children}</div>
    </div>
  );
}
