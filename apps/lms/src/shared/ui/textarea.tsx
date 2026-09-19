"use client";

import type { ComponentPropsWithRef } from "react";
import { INPUT_BASE, cn } from "@ssccops/ui";

/*
 * 여러 줄 입력 (#528).
 *
 * 문항 편집기의 «지원자 안내문»·«페이지 설명»·«문항 설명»이 이 앱에서 처음 쓴다.
 * `INPUT_BASE`를 `@ssccops/ui`에서 가져오므로 `TextField`와 테두리·글자 크기·포커스 고리가
 * 저절로 같다 — 사본을 두면 한쪽만 손봤을 때 두 입력란이 갈린다.
 *
 * 16px는 iOS 자동 확대 방지다(`INPUT_BASE` 주석) — 좁은 화면에서 포커스가 가면 페이지를
 * 통째로 확대하고 되돌리지 않는다.
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
