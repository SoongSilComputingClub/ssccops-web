"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Variant = "primary" | "ghost" | "ghost-danger" | "danger" | "link" | "link-danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  block?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent border border-accent text-on-solid font-semibold hover:bg-accent-strong hover:border-accent-strong",
  ghost:
    "border border-line-strong text-n300 hover:border-accent hover:text-accent",
  "ghost-danger":
    "border border-line-strong text-n300 hover:border-danger hover:text-danger",
  /** 되돌릴 수 없는 삭제처럼 늘 위험을 드러내야 하는 자리 — hover에서만 붉어지는 ghost-danger와 다르다 */
  danger:
    "bg-danger border border-danger text-on-solid font-semibold hover:bg-danger-strong hover:border-danger-strong",
  /**
   * 글자만 있는 버튼 — «수정»·«복제»·«전체보기 ›»처럼 목록 카드와 헤더에 들어가는 것 (UI 감사 D5 · #470).
   *
   * 그전에는 자리마다 `className="cursor-pointer text-[14px] text-accent"`인 맨 `<button>`이었고
   * 글자 높이(20~21px)가 곧 히트 영역이라 손가락으로 빗나갔다(19곳, 목록 화면에서 30개까지).
   * 시각 크기는 그대로 두고 **패딩을 음수 마진으로 상쇄**해 히트 영역만 24px 이상으로 키운다 —
   * 그래서 배경·테두리·둥근 모서리가 없고 `size`·`block`의 패딩도 받지 않는다.
   */
  link: "text-accent hover:text-accent-strong",
  "link-danger": "text-danger hover:text-danger-strong",
};
const LINK_SHAPE =
  "-mx-1 -my-1 inline-flex min-h-6 items-center px-1 py-1 text-[14px] rounded-[6px] focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none";

export function Button({
  variant = "primary",
  size = "md",
  block,
  className,
  type = "button",
  ...rest
}: Readonly<ButtonProps>) {
  const isLink = variant === "link" || variant === "link-danger";
  return (
    <button
      type={type}
      className={cn(
        "cursor-pointer whitespace-nowrap text-center transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        isLink ? LINK_SHAPE : "rounded-[12px]",
        !isLink && (size === "md" ? "px-4 py-[9px] text-[15px]" : "px-3 py-[6px] text-[14px]"),
        !isLink && block && "w-full",
        VARIANT[variant],
        className,
      )}
      {...rest}
    />
  );
}
