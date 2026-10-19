"use client";

import type { ReactNode, UIEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";

/** 페이지 상단 헤더 — 타이틀/서브타이틀/뒤로가기/주요 액션 */
export function PageHeader({
  title,
  subtitle,
  showBack,
  action,
  right,
}: Readonly<{
  title: ReactNode;
  subtitle?: ReactNode;
  showBack?: boolean;
  /**
   * 주요 액션. `disabled`와 `title`은 권한이 없을 때 쓴다 (#29) — 감추지 않고 잠근 채
   * 이유를 툴팁으로 붙인다. 근거는 features/auth/model/use-can.ts.
   */
  action?: { label: string; onClick: () => void; disabled?: boolean; title?: string };
  /** 제목 오른쪽의 보조 요소 — `/notifications`의 ⚙ «설정»(#634)처럼 주요 액션이 아닌 토글 버튼 */
  right?: ReactNode;
}>) {
  const router = useRouter();
  return (
    // 좌우 여백은 상단 바(mobile-nav)와 같은 px-4 — 375에서 본문 폭 311px이던 것을 343px로 (UI 감사 D15 · #470)
    <div
      /*
       * 경계는 본문을 스크롤한 뒤에만 (#798 · ssccops#535 — www 상단 바 #721과 같은 규칙).
       *
       * 어드민은 셸이 `h-dvh`라 창이 아니라 `PageBody`가 스크롤한다. 그래서 www처럼 창 스크롤을
       * 듣지 않고, 형제인 `PageBody`가 `data-scrolled`를 달면 셸의 `group/page`를 거쳐 이 줄이
       * 읽는다 — 둘 사이에 상태를 건네는 배선이 없다. `relative z-10`은 그림자가 바로 밑 본문에
       * 덮이지 않게 하려는 것이다.
       */
      className="relative z-10 flex flex-none items-center gap-[14px] border-b border-transparent bg-gradient-to-b from-surface to-bg px-4 py-5 transition-[border-color,box-shadow] duration-150 group-has-[[data-scrolled]]/page:border-line group-has-[[data-scrolled]]/page:shadow-[0_2px_10px_var(--color-header-edge)] lg:px-8"
    >
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
      {right}
      {action && (
        <Button onClick={action.onClick} disabled={action.disabled} title={action.title}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * 스크롤 본문 래퍼 (max-width 1000px).
 *
 * 스크롤이 맨 위를 벗어나면 `data-scrolled`를 단다 — 위 `PageHeader`가 그것을 보고 경계를 켠다
 * (#798). 상태 변경은 스크롤 이벤트 안에서만 일어난다(effect 없음).
 */
export function PageBody({
  children,
  maxWidth = 1000,
}: Readonly<{
  children: ReactNode;
  maxWidth?: number;
}>) {
  const [scrolled, setScrolled] = useState(false);
  // 4px — 관성 스크롤이 0 언저리에서 떠는 동안 경계가 깜빡이지 않을 만큼만 띄운다(www와 같은 값)
  const onScroll = (e: UIEvent<HTMLDivElement>) => setScrolled(e.currentTarget.scrollTop > 4);
  return (
    <div
      onScroll={onScroll}
      data-scrolled={scrolled ? "" : undefined}
      className="flex-1 overflow-y-auto px-4 pt-6 pb-[60px] lg:px-8"
    >
      <div style={{ maxWidth }}>{children}</div>
    </div>
  );
}
