"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/** 필터 칩 — CHIP_ON / CHIP_OFF */
export function Chip({
  active,
  onClick,
  disabled,
  title,
  children,
  className,
}: Readonly<{
  active?: boolean;
  onClick?: () => void;
  /**
   * 고를 수 없는 선택지를 잠근다 — 감추지 않고 잠근 채 이유를 `title`로 붙인다.
   *
   * 역할 부여 시트(#50)가 **이미 겹치는 기간에 부여된 역할**을 이렇게 잠근다. 목록에서
   * 빼 버리면 "왜 이 역할이 없지"가 화면에서 사라지고, 열어 두면 서버가 409로 거절한다.
   * Toggle·Sheet의 okDisabled가 같은 판단을 했다 (features/auth/model/use-can.ts).
   */
  disabled?: boolean;
  /** 잠긴 이유 — 툴팁으로 붙는다 */
  title?: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      /*
       * 켜져 있다는 것을 색 말고 속성으로도 말한다 (#692 · ssccops#511).
       *
       * 그전에는 테두리·배경색만 바뀌어, 폼 목록의 접수 상태 칩 다섯 개(#544 — 다중 선택이다)
       * 에서 «지금 무엇으로 걸러져 있는가»가 보조기기에 통째로 사라졌다. `packages/signup`의
       * 같은 이름 부품이 이미 `aria-pressed`를 쓰고 있어 그쪽과 같은 속성으로 맞춘다.
       *
       * 단일 선택인 `ChipGroup`도 같은 속성을 쓴다 — `aria-pressed`는 «이 버튼이 켜져 있다»는
       * 사실이라 단일·다중 어느 쪽에서도 거짓이 되지 않는다.
       */
      aria-pressed={active}
      className={cn(
        "cursor-pointer whitespace-nowrap rounded-full border px-3 py-[6px] text-[14px] transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:text-n400",
        active
          ? "border-accent-strong bg-accent-soft text-accent-strong"
          : "border-line bg-transparent text-n400 hover:text-n300",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** 단일 선택 칩 그룹 */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: Readonly<{
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** 그룹이 무엇을 고르는 것인지 — 칩만 나열하면 무엇의 목록인지 안 들린다 (#692) */
  label?: string;
  className?: string;
}>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-[7px]", className)}
    >
      {options.map((option) => (
        <Chip key={option} active={option === value} onClick={() => onChange(option)}>
          {option}
        </Chip>
      ))}
    </div>
  );
}
