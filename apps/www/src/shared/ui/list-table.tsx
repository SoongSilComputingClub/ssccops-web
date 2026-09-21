import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * 목록의 리스트 보기 틀 — 데스크톱은 표, lg 미만은 카드 (#573 · #591 · ssccops#439).
 *
 * `views/event-list/ui/event-table.tsx`(#573)에 있던 표 틀을 올렸다. 그때는 «둘째 화면이 생기면
 * 그때 `packages/ui`로»라고 적었는데, 둘째 화면(`/academic`의 학술 프로그램 목록)이 같은 앱 안에
 * 생겼고 views 슬라이스끼리는 가져가지 못한다(루트 AGENTS «FSD») — 세 앱이 쓰는 것이 아니라
 * `packages/ui`가 아니라 여기다.
 *
 * 열 트랙은 부르는 쪽이 `lg:grid-cols-[…]` 클래스로 준다 — Tailwind v4는 소스에 적힌 리터럴만
 * 클래스로 만들어 이 파일이 값을 받아 조립할 수 없고, `style`로 주면 `lg` 분기점을 못 탄다.
 *
 * **lg 미만은 같은 데이터를 카드로 그린다** — 열 넷·다섯이 375px에 서지 않는다. CSS만으로는 못
 * 바꿔 두 벌을 그리고 `hidden`으로 가린다: 행이 `contents`라 행마다 박스가 없고, 서버 렌더라
 * 화면 폭을 보고 한쪽만 그릴 수도 없다(첫 페인트에 잘못된 쪽이 보인다). 카드 쪽은 부르는 쪽이
 * `compact`로 준다.
 *
 * 제목만 링크다. 어드민은 행 전체가 `role="button"`인데 여기는 셀이 `contents` 안에 흩어져 행
 * 박스가 없고, 셀마다 링크를 걸면 한 행이 다섯 정거장이 된다. 좁은 화면의 카드는 카드 전체가
 * 링크다(디자인 시스템 «카드»).
 */
export function ListTable({
  columns,
  headers,
  children,
  compact,
}: Readonly<{
  /** 열 트랙 — `lg:grid-cols-[150px_minmax(0,1.4fr)_…]` 리터럴 */
  columns: string;
  headers: readonly string[];
  /** 데스크톱 표의 행들 — 각 행은 `ListRow` */
  children: ReactNode;
  /** lg 미만에서 같은 데이터를 그리는 카드들 */
  compact: ReactNode;
}>) {
  return (
    <>
      <div
        className={cn(
          "hidden rounded-2xl bg-surface px-[18px] pt-[14px] shadow-[0_0_0_1px_var(--color-line)] lg:grid lg:gap-x-[14px]",
          columns,
        )}
      >
        {headers.map((header) => (
          <div key={header} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
            {header}
          </div>
        ))}
        {children}
      </div>

      <div className="flex flex-col gap-[10px] lg:hidden">{compact}</div>
    </>
  );
}

/** 표의 한 행 — 셀들이 `contents`로 열 트랙에 바로 앉는다 */
export function ListRow({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="contents">{children}</div>;
}

/** 셀 — 기본은 한 줄에 말줄임, `wrap`이면 줄바꿈. `muted`는 보조 글자(n300 · 14px) */
export function ListCell({
  wrap,
  muted,
  children,
}: Readonly<{
  wrap?: boolean;
  muted?: boolean;
  children?: ReactNode;
}>) {
  return (
    <div
      className={cn(
        "min-w-0 border-t border-line py-[13px] leading-[1.45]",
        wrap ? "whitespace-normal" : "overflow-hidden text-ellipsis whitespace-nowrap",
        muted ? "text-[14px] text-n300" : "text-[15px]",
      )}
    >
      {children}
    </div>
  );
}

/**
 * 좁은 화면의 한 장 — 카드 전체가 링크인 상자. 안의 줄(배지 · 제목 · 보조 정보)은 부르는 쪽이
 * 채운다(목록마다 다르다). `EventCard`를 그대로 한 열로 세우지 않는 것은 리스트를 고른 사람이
 * 원하는 것이 «한눈에 훑기»라서다 — 이미지가 한 장마다 서면 카드 보기와 다를 것이 없다.
 */
export const COMPACT_CARD_CLASS =
  "flex flex-col gap-[6px] rounded-2xl bg-surface p-[14px] shadow-[0_0_0_1px_var(--color-line)] transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent-strong)]";
