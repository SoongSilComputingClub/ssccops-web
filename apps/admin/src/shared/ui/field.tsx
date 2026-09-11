"use client";

import type { ComponentPropsWithRef, SelectHTMLAttributes } from "react";
import { cn, Field, TextField } from "@ssccops/ui";

/*
 * 입력 컴포넌트 — `TextField`·`Field`는 `@ssccops/ui`에서 온다 (ssccops#243).
 *
 * `Field`는 세 앱이 글자까지 같았고, `TextField`는 이쪽이 자라 있어(`inset`) 그것을 올렸다.
 * **`TextArea`·`SelectField`는 이 앱에만 있어 여기 남는다** — 중복이 아니다.
 *
 * 좁은 화면 16px 규칙(#105)은 패키지의 `INPUT_BASE`가 갖는다. 아래 둘은 그 규칙을 **각자
 * 적어 두고 있으므로** 패키지 쪽을 고칠 때 여기도 함께 본다 — 그때 이 둘도 패키지로 올릴지
 * 판단하면 된다(지금은 쓰는 앱이 하나라 올릴 이유가 없다).
 */
const INPUT_BASE =
  "w-full rounded-[12px] border text-[16px] text-ink outline-none placeholder:text-n500 focus:border-accent disabled:cursor-not-allowed disabled:opacity-45 lg:text-[15.5px]";

export { Field, TextField };

/*
 * props에 ref가 들어 있는 것은 React 19에서 함수 컴포넌트가 ref를 평범한 prop으로 받기
 * 때문이다(forwardRef가 필요 없다). 본문 편집처럼 **커서 위치를 알아야 하는** 화면이
 * textarea 요소 자체를 잡아야 해서 열어 뒀다 — 행사 본문에 이미지를 넣는 자리다(#148).
 */
export function TextArea({
  inset,
  className,
  ...rest
}: Readonly<ComponentPropsWithRef<"textarea"> & { inset?: boolean }>) {
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

export function SelectField({ className, ...rest }: Readonly<SelectHTMLAttributes<HTMLSelectElement>>) {
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
