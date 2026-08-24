"use client";

import { cn } from "@/shared/lib/cn";

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[12px] border border-line bg-surface px-[11px]",
        className,
      )}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-none text-n500">
        <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        // 16px는 iOS 자동 확대 방지다 — field.tsx의 INPUT_BASE 주석 참조 (#105)
        className="flex-1 border-none bg-transparent py-[9px] text-[16px] text-ink outline-none placeholder:text-n500 lg:text-[15.5px]"
      />
    </div>
  );
}
