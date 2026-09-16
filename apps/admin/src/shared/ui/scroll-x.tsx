import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/*
 * 좁은 화면에서 옆으로 밀어 보는 표의 상자 (UI 감사 D13 · #472).
 *
 * `overflow-x-auto` + `min-w-[600px]` 표(분류 표·CSV 이관 표)는 375에서 규칙 위반은 아니지만 사용자가
 * «옆으로 밀 수 있다»를 알 단서가 없었다 — 잘린 자리에 오른쪽 페이드를 얹고 그 아래 한 줄로 알린다.
 * 둘 다 `lg:hidden`이라 표가 다 들어가는 폭에서는 아무것도 그리지 않는다. GridTable의 카드 전환(#85)을
 * 쓰지 않은 표를 위한 것이고, 열이 넷뿐인 분류 표는 GridTable로 옮기는 편이 낫다(별도).
 */
export function ScrollX({
  children,
  className,
  maxHeightClassName,
}: Readonly<{
  children: ReactNode;
  className?: string;
  /** 세로 스크롤도 함께 거는 표(CSV 결과)는 `max-h-*`를 넘긴다 */
  maxHeightClassName?: string;
}>) {
  return (
    <div className={cn("relative", className)}>
      <div className={cn("overflow-x-auto", maxHeightClassName && `${maxHeightClassName} overflow-y-auto`)}>
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent lg:hidden"
      />
      <div className="mt-[6px] text-[12.5px] text-n500 lg:hidden">옆으로 밀어서 볼 수 있습니다</div>
    </div>
  );
}
