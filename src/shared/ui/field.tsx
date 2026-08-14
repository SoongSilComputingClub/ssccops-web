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
  invalid,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { inset?: boolean; invalid?: boolean }) {
  return (
    <input
      // 색만으로 오류를 알리면 스크린리더·색각 이상 사용자가 놓친다 — 상태를 함께 노출한다
      aria-invalid={invalid || undefined}
      className={cn(
        INPUT_BASE,
        "px-[11px] py-[9px]",
        inset ? "border-transparent bg-bg" : "border-line bg-surface",
        invalid && "border-danger focus:border-danger",
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

/**
 * 라벨 + 입력 래퍼.
 *
 * `error`는 입력칸 바로 아래에 붙는다 — 토스트 한 줄로 알리면 여러 칸이 잘못됐을 때
 * 어디를 고쳐야 하는지 알 수 없고, 메시지가 사라진 뒤에는 다시 볼 수도 없다.
 */
export function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: ReactNode;
  required?: boolean;
  error?: string | null;
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
      {error && <div className="mt-[5px] text-[12.5px] text-danger">{error}</div>}
    </div>
  );
}
