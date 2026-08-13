"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface GridColumn<T> {
  key: string;
  header: ReactNode;
  /** grid track — 예: "2fr", ".8fr", "120px" */
  width: string;
  align?: "left" | "right";
  render: (row: T, index: number) => ReactNode;
}

/**
 * 원본 디자인의 CSS-grid 테이블 관례:
 * 헤더 13px n500 · 행 구분 rgba(0,0,0,.06) 상단 보더 · 셀 15px, truncate
 */
export function GridTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  dense,
  empty,
}: {
  columns: GridColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  dense?: boolean;
  empty?: ReactNode;
}) {
  return (
    <div>
      <div
        className="grid"
        style={{ gridTemplateColumns: columns.map((c) => c.width).join(" ") }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn(
              "pb-[10px] text-[13px] tracking-[.3px] text-n500",
              col.align === "right" && "text-right",
            )}
          >
            {col.header}
          </div>
        ))}
        {rows.map((row, index) => (
          <div key={rowKey(row, index)} className="contents">
            {columns.map((col) => (
              <div
                key={col.key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "min-w-0 overflow-hidden border-t border-black/5 text-[15px] text-ellipsis whitespace-nowrap",
                  dense ? "py-3" : "py-[13px]",
                  col.align === "right" && "text-right",
                  onRowClick && "cursor-pointer",
                )}
              >
                {col.render(row, index)}
              </div>
            ))}
          </div>
        ))}
      </div>
      {rows.length === 0 && empty}
    </div>
  );
}
