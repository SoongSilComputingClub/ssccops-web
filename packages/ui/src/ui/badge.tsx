import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/*
 * 배지와 필 — 세 앱이 함께 쓴다 (ssccops#243).
 *
 * www·lms에 **글자까지 같은 사본**이 있었고 admin 것이 자라 있었다(빨강·outline-red 톤,
 * 잠긴 이유를 붙이는 `title`, 톤을 받는 `Pill`). 자란 쪽을 기준으로 올린다 — 빠진 톤은
 * 안 쓰면 그만이지만, 좁은 쪽을 기준으로 하면 admin에서 쓰던 것이 사라진다.
 *
 * **색이 `var(--color-*)`인 것은 admin에서 왔다.** www·lms는 같은 색을 `#d1d6db`처럼 값으로
 * 적고 있었는데, 세 앱의 `@theme`이 그 토큰을 **같은 값으로** 정의하므로 지금 화면은 그대로다.
 * 대신 www·lms가 나중에 다크모드를 켜면(ssccops#226이 admin에 한 것) 따라온다 — 값으로 박혀
 * 있으면 그때 이 파일을 다시 훑어야 했다.
 */

/** 배지 어휘: blue(강조) · grey(중립) · red(경고) · amber(주의) · outline 계열 */
export type BadgeTone =
  | "blue"
  | "grey"
  | "red"
  | "amber"
  | "outline"
  | "outline-accent"
  | "outline-red";

const TONE: Record<BadgeTone, string> = {
  blue: "bg-accent-soft text-accent",
  grey: "bg-bg text-n300",
  red: "bg-danger/10 text-danger",
  amber: "bg-amber-soft text-amber",
  outline: "shadow-[inset_0_0_0_1px_var(--color-line-strong)] text-n400",
  "outline-accent": "shadow-[inset_0_0_0_1px_var(--color-accent)] text-accent",
  "outline-red":
    "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-danger)_35%,transparent)] text-danger",
};

export function Badge({
  tone = "grey",
  className,
  title,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  /** 배지가 짧게만 말하고 나머지를 마우스 위에서 알릴 때 쓴다 (예: 시스템 폼의 잠금 사유) */
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-block whitespace-nowrap rounded-[6px] px-[7px] py-[2px] text-[13px]",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * 라운드 필 — 상태가 아니라 **이름표**에 쓴다(긴급·대표·폼 라벨·행사 분류).
 *
 * 배지와 모양을 나눠 둔 것은 둘이 섞이면 "지금 어떤 상태인가"와 "무엇으로 분류되는가"가
 * 한 줄에서 구별되지 않기 때문이다.
 */
export function Pill({
  tone = "blue",
  className,
  children,
}: {
  tone?: "blue" | "red" | "outline";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    blue: "bg-accent-soft text-accent",
    red: "bg-danger/10 text-danger",
    outline: "shadow-[inset_0_0_0_1px_var(--color-line-strong)] text-n400",
  };
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2 py-[2px] text-[12.5px]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
