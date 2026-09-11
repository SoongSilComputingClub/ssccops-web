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
export function EventCard({ event }: Readonly<{ event: PublicEventSummary }>) {
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
          /*
           * 정사각형 틀이다 (ssccops#273). 운영진이 붙이는 것은 카드뉴스라 1:1로 만들어
           * 오는데, 가로로 긴 틀에 object-cover로 채우면 위아래가 날아갔다.
           *
           * object-cover를 그대로 두는 것은 가로형 이미지를 올린 지난 행사 때문이다 —
           * 그쪽은 좌우가 잘리지만 카드의 줄이 흐트러지지는 않는다.
           */
          className="aspect-square w-full bg-bg object-cover"
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
