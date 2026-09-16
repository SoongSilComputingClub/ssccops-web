import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/*
 * 필터 칩 줄 (UI 감사 D1 · #470).
 *
 * 하위 업무 목록의 칩 줄(탭 8 + 구분선 + «내 업무» + 건수)이 375px에서 `flex-wrap` 없이 651px로
 * 늘어나 본문 전체에 가로 스크롤이 생기고, 줄 끝의 건수 텍스트가 화면 밖에서 폭 14px로 찌그러져
 * 한 글자씩 줄바꿈되며 줄 높이가 147px이 됐다 — 운영진이 본 «헤더와 칩 사이 150px 빈 공간»이
 * 그것이다. 같은 모양의 줄이 승인함·업무 목록·회의 상세에도 있어 한 벌로 둔다. 칩은
 * `whitespace-nowrap`(줄어들지 않는다)이므로 **줄이 접혀야** 한다. 건수처럼 오른쪽에 붙는 것은
 * `trailing`으로 받아 `ml-auto`를 주고, 접힌 뒤에는 자기 줄에서 오른쪽에 선다.
 */
export function FilterBar({
  children,
  trailing,
  className,
}: Readonly<{
  children: ReactNode;
  /** 오른쪽 끝 — 건수·정렬 같은 것 */
  trailing?: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn("mb-[14px] flex flex-wrap items-center gap-[7px]", className)}>
      {children}
      {trailing !== undefined && trailing !== null && (
        <div className="ml-auto text-[14px] text-n500">{trailing}</div>
      )}
    </div>
  );
}
