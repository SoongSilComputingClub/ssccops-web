import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface KeyValueItem {
  k: ReactNode;
  v: ReactNode;
}

/** 상세 화면 공통 라벨-값 그리드 (라벨 84~90px) */
export function KeyValueGrid({
  items,
  labelWidth = 84,
  className,
}: Readonly<{
  items: KeyValueItem[];
  labelWidth?: number;
  className?: string;
}>) {
  return (
    <div
      className={cn("grid gap-y-[9px] text-[15px]", className)}
      style={{ gridTemplateColumns: `${labelWidth}px 1fr` }}
    >
      {/*
        key=index로 둔다 (#401 · S6479). 호출부가 상수 배열로 넘기는 표시 전용 표라 옮기거나
        지우지 않고, `k`·`v`가 ReactNode라 값으로 key를 만들 수도 없다.
      */}
      {items.map((item, i) => (
        <div key={i} className="contents">
          <div className="text-[14px] text-n500">{item.k}</div>
          <div className="min-w-0 text-n300">{item.v}</div>
        </div>
      ))}
    </div>
  );
}
