"use client";

import { cn } from "@/shared/lib/cn";

/** 스위치 토글 — md 38×22 / sm 34×20 */
export function Toggle({
  on,
  onChange,
  label,
  size = "md",
  disabled,
  title,
  className,
}: Readonly<{
  on: boolean;
  onChange: (on: boolean) => void;
  /**
   * 무엇을 켜는 스위치인가 — `aria-label`이 된다. 필수인 이유: `role="switch"`·`aria-checked`는
   * 있었지만 이름이 없어 보조기기에 «스위치, 켜짐»으로만 읽혔다(UI 감사 D6 · #470). 옆에 제목이
   * 그려져 있어도 형제 요소라 이름이 되지 않는다. 화면이 이미 옆에 그리는 문구(라벨명·유형명)를
   * 그대로 넘기면 된다.
   */
  label: string;
  size?: "md" | "sm";
  /** 권한이 없을 때 잠근다 (#29). 감추지 않는 근거는 features/auth/model/use-can.ts */
  disabled?: boolean;
  /** 잠긴 이유 — 툴팁으로 붙는다 */
  title?: string;
  className?: string;
}>) {
  const md = size === "md";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      title={title}
      onClick={() => onChange(!on)}
      className={cn(
        // 시각 크기(22·20px)는 그대로 두고 히트 영역만 24px 이상으로 — before 가상 요소가 사방 4px 을 더 받는다 (D6)
        "relative cursor-pointer rounded-full transition-colors duration-[180ms] before:absolute before:-inset-1 before:content-['']",
        "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-45",
        md ? "h-[22px] w-[38px]" : "h-[20px] w-[34px]",
        on ? "bg-accent" : "bg-line-strong",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] rounded-full bg-surface transition-[left] duration-[180ms]",
          md ? "size-4" : "size-[14px]",
          on ? (md ? "left-[19px]" : "left-[17px]") : "left-[3px]",
        )}
      />
    </button>
  );
}
