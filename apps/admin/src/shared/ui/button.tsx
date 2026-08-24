"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Variant = "primary" | "ghost" | "ghost-danger" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  block?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent border border-accent text-white font-semibold hover:bg-accent-strong hover:border-accent-strong",
  ghost:
    "border border-line-strong text-n300 hover:border-accent hover:text-accent",
  "ghost-danger":
    "border border-line-strong text-n300 hover:border-danger hover:text-danger",
  /** 되돌릴 수 없는 삭제처럼 늘 위험을 드러내야 하는 자리 — hover에서만 붉어지는 ghost-danger와 다르다 */
  danger:
    "bg-danger border border-danger text-white font-semibold hover:bg-danger-strong hover:border-danger-strong",
};

export function Button({
  variant = "primary",
  size = "md",
  block,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "cursor-pointer whitespace-nowrap rounded-[12px] text-center transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        size === "md" ? "px-4 py-[9px] text-[15px]" : "px-3 py-[6px] text-[14px]",
        VARIANT[variant],
        block && "w-full",
        className,
      )}
      {...rest}
    />
  );
}
