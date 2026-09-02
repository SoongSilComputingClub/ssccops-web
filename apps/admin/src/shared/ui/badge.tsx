import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/** 원본 배지 어휘: blue(GRADE) · grey(NEUT) · red(WARN) · amber(REVIEW) · outline · outline-accent */
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
  outline: "shadow-[inset_0_0_0_1px_#d1d6db] text-n400",
  "outline-accent": "shadow-[inset_0_0_0_1px_#3182f6] text-accent",
  "outline-red": "shadow-[inset_0_0_0_1px_rgba(240,68,82,.35)] text-danger",
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

/** 라운드 필 (긴급, 대표, 폼 라벨 등) */
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
    outline: "shadow-[inset_0_0_0_1px_#d1d6db] text-n400",
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
