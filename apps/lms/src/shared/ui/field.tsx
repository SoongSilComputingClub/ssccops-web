"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/*
 * 입력 한 칸 — 이 앱에 처음 생기는 입력 컴포넌트다.
 *
 * 목록·상세·'내 신청'은 읽기만 하는 화면이라 입력란이 없었고, 신청 흐름의 간편 가입 폼(#154)이
 * 처음 필요로 한다. 어드민 `shared/ui/field.tsx`와 같은 값·같은 규칙으로 두되 **필요한 것만**
 * 옮겼다(select·textarea는 아직 쓰는 자리가 없다) — 쓰지 않는 컴포넌트를 함께 옮기면 두 앱이
 * 갈릴 때 무엇이 실제로 쓰이는지 알 수 없다.
 *
 * 문항 입력란은 여기 있지 않다. 폼 문항은 `@ssccops/form-renderer`의 `QitemCard`가 그린다 —
 * 그쪽을 앱에서 다시 그리면 검증 규칙이 두 벌이 된다(#152).
 *
 * **좁은 화면에서 글자를 16px 아래로 내리지 않는다.** iOS Safari는 16px 미만인 입력란에
 * 포커스하면 화면을 자동 확대하고 그 확대가 스스로 돌아오지 않는다 — 첫 칸을 누르는 순간 폼
 * 전체가 커진 채로 남는다. 미관이 아니라 동작 문제다(어드민 #105).
 */
const INPUT_BASE =
  "w-full rounded-[12px] border bg-surface px-[11px] py-[9px] text-[16px] text-ink outline-none placeholder:text-n500 focus:border-accent disabled:cursor-not-allowed disabled:opacity-45 lg:text-[15.5px]";

export function TextField({
  invalid,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      // 색만으로 오류를 알리면 스크린리더·색각 이상 사용자가 놓친다 — 상태를 함께 노출한다
      aria-invalid={invalid || undefined}
      className={cn(
        INPUT_BASE,
        invalid ? "border-danger focus:border-danger" : "border-line",
        className,
      )}
      {...rest}
    />
  );
}

/**
 * 라벨 + 입력 래퍼.
 *
 * `error`는 입력칸 바로 아래에 붙는다 — 한 줄 안내로 뭉뚱그리면 여러 칸이 잘못됐을 때 어디를
 * 고쳐야 하는지 알 수 없다.
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

/** 몇 안 되는 선택지를 나란히 놓는 칩 — 재학·졸업처럼 목록으로 접을 이유가 없는 자리에 쓴다 */
export function Chip({
  active,
  onClick,
  disabled,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-full px-[14px] py-[7px] text-[14px] transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? "bg-accent text-white"
          : "bg-surface text-n300 shadow-[inset_0_0_0_1px_#d1d6db] hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
