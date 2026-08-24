"use client";

import { cn } from "@/shared/lib/cn";

/** 박스형 세그먼트 컨트롤 (역할 목록/분류 · 프로필/연결된 계정) */
export function Segmented<T extends string>({
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
    <div
      className={cn(
        "flex rounded-[12px] border border-line bg-surface p-[3px]",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "flex-1 cursor-pointer rounded-[9px] py-2 text-center text-[14px] transition-colors",
            option === value
              ? "bg-accent-soft font-semibold text-accent"
              : "text-n400 hover:text-n300",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
