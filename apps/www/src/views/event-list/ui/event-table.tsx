import Link from "next/link";
import {
  eventPhaseBadge,
  eventReceiptBadge,
  type PublicEventSummary,
} from "@/entities/event";
import { ROUTES } from "@/shared/config/routes";
import { formatEventPeriod } from "@/shared/lib/date";
import { Badge, COMPACT_CARD_CLASS, ListCell, ListRow, ListTable, Pill } from "@/shared/ui";

/**
 * 행사 목록의 리스트 보기 — 한 줄에 상태 · 제목 · 분류 · 일시 · 장소 (#573 · ssccops#427).
 *
 * 표의 틀(데스크톱 표 · lg 미만 카드 · 셀 규칙)은 `shared/ui/list-table.tsx`다 — #573에서는 이
 * 파일에 있었는데 `/academic`의 학술 프로그램 목록(#591 · ssccops#439)이 같은 모양을 쓰게 되어
 * 올렸다. 여기 남은 것은 행사 한 줄의 열 구성뿐이다.
 *
 * **정원·확정 열이 없다.** 목록 계약(`PublicEventSummary`)에 `ptcpLmtCnt`·`confirmedCount`가
 * 없다 — 상세에만 온다. 목록에서 세지 않고 열을 비운다(없는 값을 만들어 내지 않는다). 서버가
 * 목록에 실어 주면 그때 열을 더한다.
 */
export function EventTable({ events }: Readonly<{ events: PublicEventSummary[] }>) {
  return (
    <ListTable
      columns="lg:grid-cols-[150px_minmax(0,1.4fr)_100px_minmax(0,1.2fr)_minmax(0,.7fr)]"
      headers={["상태", "제목", "분류", "일시", "장소"]}
      compact={events.map((event) => (
        <EventCompactCard key={event.eventId} event={event} />
      ))}
    >
      {events.map((event) => (
        <EventRow key={event.eventId} event={event} />
      ))}
    </ListTable>
  );
}

/** 표의 한 행 — 셀 다섯 */
function EventRow({ event }: Readonly<{ event: PublicEventSummary }>) {
  const phase = eventPhaseBadge(event.eventPhase);
  const receipt = eventReceiptBadge(event.receiptStatus);
  const period = formatEventPeriod(event.eventBgngDt, event.eventEndDt);

  return (
    <ListRow>
      <ListCell>
        {/* 배지가 둘까지 — 카드와 같은 순서(모집 · 단계). 둘 다 없으면 칸을 비운다 */}
        {(receipt || phase) && (
          <div className="flex flex-wrap items-center gap-[6px]">
            {receipt && <Badge tone={receipt.tone}>{receipt.label}</Badge>}
            {phase && <Badge tone={phase.tone}>{phase.label}</Badge>}
          </div>
        )}
      </ListCell>
      <ListCell>
        <Link
          href={ROUTES.eventDetail(event.eventId)}
          className="font-medium text-ink transition-colors hover:text-accent-strong"
        >
          {event.eventTtl}
        </Link>
      </ListCell>
      <ListCell>
        <Pill>{event.eventClsfNm}</Pill>
      </ListCell>
      {/* 일시는 연도까지 적어 길다 — 이 칸만 줄바꿈을 허용한다 */}
      <ListCell wrap muted>
        {period}
      </ListCell>
      <ListCell muted>{event.plcNm}</ListCell>
    </ListRow>
  );
}

/** 좁은 화면의 한 장 — `EventCard`에서 대표 이미지를 뺀 모양이고 카드 전체가 링크다 */
function EventCompactCard({ event }: Readonly<{ event: PublicEventSummary }>) {
  const phase = eventPhaseBadge(event.eventPhase);
  const receipt = eventReceiptBadge(event.receiptStatus);
  const period = formatEventPeriod(event.eventBgngDt, event.eventEndDt);

  return (
    <Link href={ROUTES.eventDetail(event.eventId)} className={COMPACT_CARD_CLASS}>
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
