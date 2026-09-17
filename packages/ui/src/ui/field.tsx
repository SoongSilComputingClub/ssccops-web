"use client";

import { cloneElement, isValidElement, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

/*
 * 입력 한 칸과 라벨 래퍼 — 세 앱이 함께 쓴다 (ssccops#243).
 *
 * `Field`는 세 앱이 **글자까지 같았다.** `TextField`는 admin 것이 자라 있었고(`inset`),
 * 클래스 조립 방식만 달랐을 뿐 최종 클래스 집합은 같다 — admin은 padding·배경을 호출부에서
 * 붙이고 www·lms는 base에 넣어 두었다. 자란 쪽을 올린다.
 *
 * **좁은 화면에서 글자를 16px 아래로 내리지 않는다** (admin #105). iOS Safari는 16px 미만인
 * 입력란에 포커스하면 화면을 자동 확대하고 **그 확대가 스스로 돌아오지 않는다** — 첫 칸을
 * 누르는 순간 폼 전체가 커진 채로 남는다. 미관이 아니라 동작 문제이고, 이 규칙이 세 앱에
 * 흩어져 있으면 새 입력 컴포넌트를 만드는 사람이 놓치기 쉬워 여기로 모았다.
 *
 * ── 여기 없는 것 ────────────────────────────────────────────
 * `TextArea`·`SelectField`는 admin에만 있다(중복이 아니다). `Chip`은 이름만 같고 실제로는
 * 다른 컴포넌트라 각 앱에 남겼다 — admin은 **필터 칩**(테두리 · 켜지면 accent-soft),
 * www·lms는 **선택 칩**(rounded-full · 켜지면 solid accent)이다.
 *
 * 문항 입력란도 여기 없다. 폼 문항은 `@ssccops/form-renderer`의 `QitemCard`가 그린다 —
 * 그쪽을 앱에서 다시 그리면 검증 규칙이 두 벌이 된다(#152).
 */

/*
 * disabled 표시를 base에 둔 것은 권한이 없어 잠긴 입력란이 눌리지 않는 이유를 보여야 하기 때문이다 (admin #29).
 *
 * `outline-none`으로 브라우저 기본 포커스 링을 지웠으면 **대신할 표시**가 있어야 한다 — 테두리 색이
 * `line`→`accent`로 1px 바뀌는 것뿐이라 키보드로 옮겨 다닐 때 어느 칸에 있는지 보이지 않았다
 * (ssccops-web#469 · UI 감사 D11). `focus-visible`이라 마우스 클릭에는 링이 뜨지 않는다. 세 앱의
 * `INPUT_BASE` 사본과 `@ssccops/form-renderer`가 같은 문자열을 쓰므로 여기서 내보낸다.
 */
export const INPUT_BASE =
  "w-full rounded-[12px] border text-[16px] text-ink outline-none placeholder:text-n500 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-45 lg:text-[15.5px]";

export function TextField({
  inset,
  invalid,
  className,
  ...rest
}: Readonly<InputHTMLAttributes<HTMLInputElement> & { inset?: boolean; invalid?: boolean }>) {
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

/**
 * 라벨 + 입력 래퍼.
 *
 * `error`는 입력칸 바로 아래에 붙는다 — 한 줄 안내로 뭉뚱그리면 여러 칸이 잘못됐을 때 어디를
 * 고쳐야 하는지 알 수 없다.
 *
 * ── 라벨은 `<label htmlFor>`다 (ssccops-web#469 · UI 감사 D3) ────────────────
 * 그전에는 `div`였다 — 세 앱의 입력 80개가 보조기기에서 이름 없는 칸이었고, 라벨을 눌러도 칸에
 * 초점이 가지 않았다. 자식이 **입력 하나**(input·select·textarea 또는 그것을 그리는 컴포넌트)면
 * `useId()`로 만든 id를 `cloneElement`로 넘겨 `htmlFor`와 잇는다(자식이 `id`를 이미 갖고 있으면
 * 그것을 쓴다). 자식이 하나가 아니거나 요소가 아니면(입력 옆에 버튼이 붙은 칸, 칩 묶음) 통째로
 * `<label>`로 감싸지 않는다 — 안의 버튼이 라벨 클릭에 걸린다 — 대신 `role="group"
 * aria-labelledby`로 묶는다. 오류 문구는 `aria-describedby`로 입력에 잇는다.
 */
export function Field({
  label,
  required,
  error,
  children,
  className,
}: Readonly<{
  label: ReactNode;
  required?: boolean;
  error?: string | null;
  children: ReactNode;
  className?: string;
}>) {
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const single = isValidElement<{ id?: string; "aria-describedby"?: string }>(children);
  const inputId = single ? (children.props.id ?? `${id}-input`) : undefined;
  const control = single
    ? cloneElement(children, {
        id: inputId,
        "aria-describedby": error ? errorId : children.props["aria-describedby"],
      })
    : (
        <div role="group" aria-labelledby={labelId}>
          {children}
        </div>
      );
  return (
    <div className={className}>
      <label id={labelId} htmlFor={inputId} className="mb-[6px] block text-[13.5px] text-n400">
        {label}
        {required && <span className="ml-[2px] text-accent">*</span>}
      </label>
      {control}
      {error && (
        <div id={errorId} className="mt-[5px] text-[12.5px] text-danger">
          {error}
        </div>
      )}
    </div>
  );
}
