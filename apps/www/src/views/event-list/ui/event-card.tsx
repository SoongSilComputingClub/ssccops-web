import Link from "next/link";
import {
  eventPhaseBadge,
  eventReceiptBadge,
  type PublicEventSummary,
} from "@/entities/event";
import { ROUTES } from "@/shared/config/routes";
import { formatEventDate } from "@/shared/lib/date";
import { Badge, Pill } from "@/shared/ui";

/** 목록 카드 — 대표 이미지 · 배지 · 제목 · 분류 · 일시 · 장소 */
export function EventCard({ event }: { event: PublicEventSummary }) {
  const phase = eventPhaseBadge(event.eventPhase);
  const receipt = eventReceiptBadge(event.receiptStatus);
  const date = formatEventDate(event.eventBgngDt);

  /*
   * 일시와 장소를 가운뎃점으로 잇되 **없는 쪽은 통째로 뺀다** — 값이 없다고 "장소 미정" 같은
   * 문구를 만들어 넣으면 서버가 준 값과 구별할 수 없다.
   */
  const meta = [date, event.plcNm].filter(Boolean).join(" · ");

  return (
    <Link
      href={ROUTES.eventDetail(event.eventId)}
      className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_0_0_1px_#e5e8eb] transition-shadow hover:shadow-[0_0_0_1px_#1b64da]"
    >
      {event.thmbUrlAddr && (
        /*
         * next/image 를 쓰지 않는다 — 대표 이미지는 운영진이 붙이는 외부 URL 이라 허용
         * 도메인(remotePatterns)을 미리 알 수 없다.
         */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.thmbUrlAddr}
          alt=""
          className="h-[140px] w-full bg-bg object-cover lg:h-[150px]"
        />
      )}
      <div className="flex flex-1 flex-col gap-[6px] p-[16px] lg:p-[18px]">
        {(phase || receipt) && (
          <div className="flex flex-wrap items-center gap-[6px]">
            {receipt && <Badge tone={receipt.tone}>{receipt.label}</Badge>}
            {phase && <Badge tone={phase.tone}>{phase.label}</Badge>}
          </div>
        )}
        <div className="text-[17px] font-semibold leading-[1.35] lg:text-[18px]">
          {event.eventTtl}
        </div>
        <div className="flex flex-wrap items-center gap-[8px]">
          <Pill>{event.eventClsfNm}</Pill>
          {meta && <span className="text-[13.5px] text-n500">{meta}</span>}
        </div>
      </div>
    </Link>
  );
}
