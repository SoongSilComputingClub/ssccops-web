"use client";

import type { ReactNode } from "react";
import { cn, Field, TextField } from "@ssccops/ui";

/*
 * 입력 컴포넌트 — `TextField`·`Field`는 `@ssccops/ui`에서 온다 (ssccops#243).
 *
 * **`Chip`은 이 앱에 남는다.** 어드민에도 같은 이름이 있지만 그쪽은 **필터 칩**(테두리 ·
 * 켜지면 accent-soft)이고 이쪽은 **선택 칩**(rounded-full · 켜지면 solid accent)이다 —
 * 이름만 같고 쓰임도 모양도 다르다. 합치면 한쪽 화면이 바뀐다.
 *
 * 문항 입력란은 여기 있지 않다. 폼 문항은 `@ssccops/form-renderer`의 `QitemCard`가 그린다 —
 * 그쪽을 앱에서 다시 그리면 검증 규칙이 두 벌이 된다(#152).
 */
export { Field, TextField };

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
          ? "bg-accent text-on-solid"
          : "bg-surface text-n300 shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
