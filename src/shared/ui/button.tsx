"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Variant = "primary" | "ghost" | "ghost-danger";

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
