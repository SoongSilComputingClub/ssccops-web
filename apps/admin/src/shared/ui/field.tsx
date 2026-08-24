"use client";

import type {
  ComponentPropsWithRef,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { cn } from "@/shared/lib/cn";

/* disabled 표시를 base에 둔 것은 권한이 없어 잠긴 입력란이 눌리지 않는 이유를 보여야 하기 때문이다 (#29) */
/*
 * 좁은 화면에서 16px인 이유는 미관이 아니라 동작이다 (#105).
 *
 * iOS Safari는 16px 미만인 입력란에 포커스하면 화면을 자동으로 확대하고, 그 확대는 스스로
 * 돌아오지 않는다 — 첫 칸에 입력하는 순간 폼 전체가 커진 채로 남는다. lg에서는 원래 크기를
 * 그대로 쓴다(데스크톱에는 이 동작이 없다).
 */
const INPUT_BASE =
  "w-full rounded-[12px] border text-[16px] text-ink outline-none placeholder:text-n500 focus:border-accent disabled:cursor-not-allowed disabled:opacity-45 lg:text-[15.5px]";

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

/*
 * props에 ref가 들어 있는 것은 React 19에서 함수 컴포넌트가 ref를 평범한 prop으로 받기
 * 때문이다(forwardRef가 필요 없다). 본문 편집처럼 **커서 위치를 알아야 하는** 화면이
 * textarea 요소 자체를 잡아야 해서 열어 뒀다 — 행사 본문에 이미지를 넣는 자리다(#148).
 */
export function TextArea({
  inset,
  className,
  ...rest
}: ComponentPropsWithRef<"textarea"> & { inset?: boolean }) {
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
        // 16px는 iOS 자동 확대 방지다 — INPUT_BASE의 주석 참조 (#105)
        "w-full cursor-pointer rounded-[8px] border border-line bg-surface px-[10px] py-[8px] text-[16px] text-ink outline-none focus:border-accent lg:text-[15px]",
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
