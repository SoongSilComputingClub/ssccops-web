import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/** 어드민과 같은 배지 어휘 — blue(강조) · grey(중립) · amber(주의) · outline · outline-accent */
export type BadgeTone = "blue" | "grey" | "amber" | "outline" | "outline-accent";

const TONE: Record<BadgeTone, string> = {
  blue: "bg-accent-soft text-accent",
  grey: "bg-bg text-n300",
  amber: "bg-amber-soft text-amber",
  outline: "shadow-[inset_0_0_0_1px_#d1d6db] text-n400",
  "outline-accent": "shadow-[inset_0_0_0_1px_#3182f6] text-accent",
};

export function Badge({
  tone = "grey",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
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

/** 라운드 필 — 행사 분류처럼 상태가 아닌 이름표에 쓴다(배지와 섞이지 않게 모양을 나눠 둔다) */
export function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full bg-accent-soft px-2 py-[2px] text-[12.5px] text-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}
