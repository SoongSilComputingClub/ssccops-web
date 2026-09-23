"use client";

import type { ReactNode } from "react";
import { cn } from "@ssccops/ui";

/*
 * 재학·졸업 선택 칩 — **이 패키지 안에만 있다.**
 *
 * 같은 모양이 www·lms의 `shared/ui/field.tsx`에도 있지만 그쪽은 이 가입 화면 말고도 쓰는 자리가
 * 있고(www `/me`의 라벨 필터 · lms 문항 편집기), `@ssccops/ui`로 올리지 못하는 이유는 따로
 * 있다 — 어드민에 **이름만 같고 다른 것**(필터 칩 · 테두리 · 켜지면 accent-soft)이 있어서다
 * (`packages/ui/AGENTS.md`). 앱에서 `Chip`을 prop으로 받아 오면 가입 화면의 모양이 앱마다
 * 갈릴 수 있으므로 여기서 직접 그린다 — 클래스는 두 앱의 사본과 같은 값이다.
 */
export function Chip({
  active,
  onClick,
  disabled,
  children,
}: Readonly<{
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-full px-[14px] py-[7px] text-[14px] transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? "bg-accent text-on-solid"
          : "bg-surface text-n300 shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
