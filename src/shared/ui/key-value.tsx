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
}: {
  items: KeyValueItem[];
  labelWidth?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-y-[9px] text-[15px]", className)}
      style={{ gridTemplateColumns: `${labelWidth}px 1fr` }}
    >
      {items.map((item, i) => (
        <div key={i} className="contents">
          <div className="text-[14px] text-n500">{item.k}</div>
          <div className="min-w-0 text-n300">{item.v}</div>
        </div>
      ))}
    </div>
  );
}
