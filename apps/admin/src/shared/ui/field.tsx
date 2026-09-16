"use client";

import type { ComponentPropsWithRef, SelectHTMLAttributes } from "react";
import { cn, INPUT_BASE } from "@ssccops/ui";

/*
 * 입력 컴포넌트 — `TextField`·`Field`는 `@ssccops/ui`에서 온다 (ssccops#243).
 *
 * `Field`는 세 앱이 글자까지 같았고, `TextField`는 이쪽이 자라 있어(`inset`) 그것을 올렸다.
 * **`TextArea`·`SelectField`는 이 앱에만 있어 여기 남는다** — 중복이 아니다.
 *
 * 좁은 화면 16px 규칙(#105)과 포커스 링(#469)은 패키지의 `INPUT_BASE` **한 벌**이다 — 아래 둘이
 * 같은 문자열을 각자 적어 두고 있어 패키지를 고칠 때 여기가 빠졌던 자리라(#469에서 실제로 빠질
 * 뻔했다) 패키지가 내보내는 것을 가져다 쓴다. 둘을 패키지로 올릴지는 쓰는 앱이 둘이 되면 판단한다.
 */
export { Field, TextField } from "@ssccops/ui";

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
        "w-full cursor-pointer rounded-[8px] border border-line bg-surface px-[10px] py-[8px] text-[16px] text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 lg:text-[15px]",
        className,
      )}
      {...rest}
    />
  );
}
