"use client";

import { cn } from "../lib/cn";

/*
 * 켜고 끄는 스위치 — md 38×22 / sm 34×20 (admin #470 → lms #528 → 올림 #616).
 *
 * admin `shared/ui/toggle.tsx`를 lms가 옮겨 적었고(«둘 이상» 규칙의 유예), www가 «푸시 알림»
 * 스위치(ssccops#453)로 세 번째가 되어 올렸다. 두 사본은 주석만 달랐다(코드 같음 — 올리기 전 diff).
 * 앱의 `shared/ui/toggle.tsx`는 재export 껍데기로 남는다(`theme-toggle`과 같은 자리).
 */
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
   * 있어도 이름이 없으면 보조기기에 «스위치, 켜짐»으로만 읽힌다(admin UI 감사 D6 · #470).
   * 옆에 제목이 그려져 있어도 형제 요소라 이름이 되지 않는다.
   */
  label: string;
  size?: "md" | "sm";
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
        // 시각 크기(22·20px)는 그대로 두고 히트 영역만 24px 이상으로 — before 가상 요소가 사방 4px을 더 받는다
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
