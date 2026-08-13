"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/** 필터 칩 — CHIP_ON / CHIP_OFF */
export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer whitespace-nowrap rounded-full border px-3 py-[6px] text-[14px] transition-colors",
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
