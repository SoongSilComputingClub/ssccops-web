"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/shared/lib/cn";

const INPUT_BASE =
  "w-full rounded-[12px] border text-[15.5px] text-ink outline-none placeholder:text-n500 focus:border-accent";

export function TextField({
  inset,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { inset?: boolean }) {
  return (
    <input
      className={cn(
        INPUT_BASE,
        "px-[11px] py-[9px]",
        inset ? "border-transparent bg-bg" : "border-line bg-surface",
        className,
      )}
      {...rest}
    />
  );
}

export function TextArea({
  inset,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { inset?: boolean }) {
  return (
    <textarea
      className={cn(
        INPUT_BASE,
        "min-h-[66px] resize-y px-[11px] py-[9px]",
        inset ? "border-transparent bg-bg" : "border-line bg-surface",
        className,
      )}
      {...rest}
    />
  );
}

export function SelectField({
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full cursor-pointer rounded-[8px] border border-line bg-surface px-[10px] py-[8px] text-[15px] text-ink outline-none focus:border-accent",
        className,
      )}
      {...rest}
    />
  );
}

/** 라벨 + 입력 래퍼 */
export function Field({
  label,
  required,
  children,
  className,
}: {
  label: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-[6px] text-[13.5px] text-n400">
        {label}
        {required && <span className="ml-[2px] text-accent">*</span>}
      </div>
      {children}
    </div>
  );
}
