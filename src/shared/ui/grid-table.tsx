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
  /**
   * 좁은 화면(lg 미만)의 카드에서 이 열을 감춘다 (#85).
   *
   * 표에서는 열이 늘어도 가로로 흡수되지만 카드에서는 세로로 쌓여 그만큼 길어진다.
   * 순번처럼 카드에서 의미가 없거나, 제목 옆에 이미 드러나는 값에 쓴다.
   */
  mobileHide?: boolean;
  /**
   * 카드의 제목 줄로 올린다 (#85). 라벨 없이 크게 그린다.
   *
   * 지정하지 않으면 첫 번째 열이 제목이 된다 — 목록의 첫 열은 대개 그 행을 가리키는 이름이다.
   */
  mobilePrimary?: boolean;
}

/**
 * 원본 디자인의 CSS-grid 테이블 관례:
 * 헤더 13px n500 · 행 구분 rgba(0,0,0,.06) 상단 보더 · 셀 15px, truncate
 *
 * lg(1024px) 미만에서는 같은 데이터를 카드 목록으로 그린다 (#85).
 * CSS만으로 전환할 수 없어 두 벌을 그리고 `hidden`으로 가린다 — 행이 `contents`라
 * 행마다 박스가 없고, 열 트랙이 인라인 style이라 미디어 쿼리로 덮을 수 없기 때문이다.
 * 화면 폭에 따라 한쪽만 렌더하는 방법(useMediaQuery)은 서버 렌더 결과와 어긋나
 * 첫 페인트에서 잘못된 쪽이 보인다.
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
  const primary = columns.find((c) => c.mobilePrimary) ?? columns[0];
  const secondary = columns.filter((c) => c !== primary && !c.mobileHide);

  return (
    <div>
      {/* 데스크톱 — 기존 표 그대로 */}
      <div
        className="hidden lg:grid"
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

      {/* 모바일 — 같은 데이터를 카드로. whitespace-nowrap을 걸지 않아 값이 줄바꿈된다 */}
      <div className="flex flex-col gap-2 lg:hidden">
        {rows.map((row, index) => (
          <div
            key={rowKey(row, index)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "rounded-xl border border-line bg-surface p-3",
              onRowClick && "cursor-pointer",
            )}
          >
            <div className="min-w-0 text-[15px] font-semibold break-words">
              {primary?.render(row, index)}
            </div>
            {secondary.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {secondary.map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-3">
                    <div className="flex-none text-[13px] text-n500">{col.header}</div>
                    <div className="min-w-0 text-right text-[14px] break-words">
                      {col.render(row, index)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {rows.length === 0 && empty}
    </div>
  );
}
