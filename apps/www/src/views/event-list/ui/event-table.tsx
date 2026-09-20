import Link from "next/link";
import type { ReactNode } from "react";
import {
  eventPhaseBadge,
  eventReceiptBadge,
  type PublicEventSummary,
} from "@/entities/event";
import { ROUTES } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { formatEventPeriod } from "@/shared/lib/date";
import { Badge, Pill } from "@/shared/ui";

/**
 * 행사 목록의 리스트 보기 — 한 줄에 상태 · 제목 · 분류 · 일시 · 장소 (#573 · ssccops#427).
 *
 * www에는 어드민의 `GridTable`이 없고 앱끼리 소스를 나누지 않는다(루트 AGENTS «FSD»). 이 화면
 * 하나가 쓰는 표라 공용으로 올리지 않고 여기 둔다 — 둘째 화면이 생기면 그때 `packages/ui`로.
 *
 * 같은 판단은 그대로 가져왔다. **lg 미만은 같은 데이터를 카드로 그린다** — 열 다섯이 375px에
 * 서지 않는다. CSS만으로는 못 바꿔 두 벌을 그리고 `hidden`으로 가린다: 행이 `contents`라 행마다
 * 박스가 없고, 서버 렌더라 화면 폭을 보고 한쪽만 그릴 수도 없다(첫 페인트에 잘못된 쪽이 보인다).
 *
 * **정원·확정 열이 없다.** 목록 계약(`PublicEventSummary`)에 `ptcpLmtCnt`·`confirmedCount`가
 * 없다 — 상세에만 온다. 목록에서 세지 않고 열을 비운다(없는 값을 만들어 내지 않는다). 서버가
 * 목록에 실어 주면 그때 열을 더한다.
 *
 * 제목만 링크다. 어드민은 행 전체가 `role="button"`인데 여기는 셀이 `contents` 안에 흩어져 행
 * 박스가 없고, 셀마다 링크를 걸면 한 행이 다섯 정거장이 된다. 좁은 화면의 카드는 카드 전체가
 * 링크다(디자인 시스템 «카드»).
 */
export function EventTable({ events }: Readonly<{ events: PublicEventSummary[] }>) {
  return (
    <>
      {/* 데스크톱 — 표. 열 트랙: 상태 · 제목 · 분류 · 일시 · 장소 */}
      <div className="hidden rounded-2xl bg-surface px-[18px] pt-[14px] shadow-[0_0_0_1px_var(--color-line)] lg:grid lg:grid-cols-[150px_minmax(0,1.4fr)_100px_minmax(0,1.2fr)_minmax(0,.7fr)] lg:gap-x-[14px]">
        <HeaderCell>상태</HeaderCell>
        <HeaderCell>제목</HeaderCell>
        <HeaderCell>분류</HeaderCell>
        <HeaderCell>일시</HeaderCell>
        <HeaderCell>장소</HeaderCell>
        {events.map((event) => (
          <EventRow key={event.eventId} event={event} />
        ))}
      </div>

      {/* 좁은 화면 — 같은 데이터를 카드로. 대표 이미지는 빼고 한 장에 한 줄씩 */}
      <div className="flex flex-col gap-[10px] lg:hidden">
        {events.map((event) => (
          <EventCompactCard key={event.eventId} event={event} />
        ))}
      </div>
    </>
  );
}

function HeaderCell({ children }: Readonly<{ children: string }>) {
  return <div className="pb-[10px] text-[13px] tracking-[.3px] text-n500">{children}</div>;
}

/** 표의 한 행 — 셀 다섯이 `contents`로 열 트랙에 바로 앉는다 */
function EventRow({ event }: Readonly<{ event: PublicEventSummary }>) {
  const phase = eventPhaseBadge(event.eventPhase);
  const receipt = eventReceiptBadge(event.receiptStatus);
  const period = formatEventPeriod(event.eventBgngDt, event.eventEndDt);

  return (
    <div className="contents">
      <Cell>
        {/* 배지가 둘까지 — 카드와 같은 순서(모집 · 단계). 둘 다 없으면 칸을 비운다 */}
        {(receipt || phase) && (
          <div className="flex flex-wrap items-center gap-[6px]">
            {receipt && <Badge tone={receipt.tone}>{receipt.label}</Badge>}
            {phase && <Badge tone={phase.tone}>{phase.label}</Badge>}
          </div>
        )}
      </Cell>
      <Cell>
        <Link
          href={ROUTES.eventDetail(event.eventId)}
          className="font-medium text-ink transition-colors hover:text-accent-strong"
        >
          {event.eventTtl}
        </Link>
      </Cell>
      <Cell>
        <Pill>{event.eventClsfNm}</Pill>
      </Cell>
      {/* 일시는 연도까지 적어 길다 — 이 칸만 줄바꿈을 허용한다 */}
      <Cell wrap muted>
        {period}
      </Cell>
      <Cell muted>{event.plcNm}</Cell>
    </div>
  );
}

/** 셀 — 기본은 한 줄에 말줄임, `wrap`이면 줄바꿈. `muted`는 보조 글자(n300 · 14px) */
function Cell({
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
 * 좁은 화면의 한 장 — `EventCard`에서 대표 이미지를 뺀 모양이고 카드 전체가 링크다.
 *
 * `EventCard`를 그대로 한 열로 세우지 않는 것은 리스트를 고른 사람이 원하는 것이 «한눈에
 * 훑기»라서다 — 정사각형 이미지가 한 장마다 서면 카드 보기와 다를 것이 없다.
 */
function EventCompactCard({ event }: Readonly<{ event: PublicEventSummary }>) {
  const phase = eventPhaseBadge(event.eventPhase);
  const receipt = eventReceiptBadge(event.receiptStatus);
  const period = formatEventPeriod(event.eventBgngDt, event.eventEndDt);

  return (
    <Link
      href={ROUTES.eventDetail(event.eventId)}
      className="flex flex-col gap-[6px] rounded-2xl bg-surface p-[14px] shadow-[0_0_0_1px_var(--color-line)] transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent-strong)]"
    >
      {(receipt || phase) && (
        <div className="flex flex-wrap items-center gap-[6px]">
          {receipt && <Badge tone={receipt.tone}>{receipt.label}</Badge>}
          {phase && <Badge tone={phase.tone}>{phase.label}</Badge>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-[8px]">
        <span className="text-[16px] font-semibold leading-[1.35]">{event.eventTtl}</span>
        <Pill>{event.eventClsfNm}</Pill>
      </div>
      {/* 일시·장소 — 없는 쪽은 통째로 뺀다(EventCard와 같은 규칙) */}
      {(period || event.plcNm) && (
        <div className="flex flex-col gap-[2px] text-[13.5px] text-n500">
          {period && <span>{period}</span>}
          {event.plcNm && <span>{event.plcNm}</span>}
        </div>
      )}
    </Link>
  );
}
