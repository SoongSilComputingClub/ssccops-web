"use client";

import { cn } from "@/shared/lib/cn";

/** 스위치 토글 — md 38×22 / sm 34×20 */
export function Toggle({
  on,
  onChange,
  size = "md",
  disabled,
  title,
  className,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  size?: "md" | "sm";
  /** 권한이 없을 때 잠근다 (#29). 감추지 않는 근거는 features/auth/model/use-can.ts */
  disabled?: boolean;
  /** 잠긴 이유 — 툴팁으로 붙는다 */
  title?: string;
  className?: string;
}) {
  const md = size === "md";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      title={title}
      onClick={() => onChange(!on)}
      className={cn(
        "relative cursor-pointer rounded-full transition-colors duration-[180ms]",
        "disabled:cursor-not-allowed disabled:opacity-45",
        md ? "h-[22px] w-[38px]" : "h-[20px] w-[34px]",
        on ? "bg-accent" : "bg-line-strong",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] rounded-full bg-white transition-[left] duration-[180ms]",
          md ? "size-4" : "size-[14px]",
          on ? (md ? "left-[19px]" : "left-[17px]") : "left-[3px]",
        )}
      />
    </button>
  );
}
