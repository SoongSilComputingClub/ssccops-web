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
}: {
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
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
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
  className,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-[7px]", className)}>
      {options.map((option) => (
        <Chip key={option} active={option === value} onClick={() => onChange(option)}>
          {option}
        </Chip>
      ))}
    </div>
  );
}
