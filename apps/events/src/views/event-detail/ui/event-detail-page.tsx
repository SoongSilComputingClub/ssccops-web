import Link from "next/link";
import { notFound } from "next/navigation";
import {
  eventLoadErrorMessage,
  eventPhaseBadge,
  eventReceiptBadge,
  fetchPublicEvent,
  isEventNotFound,
  type PublicEventDetail,
} from "@/entities/event";
import { ROUTES } from "@/shared/config/routes";
import { Badge, Card, EmptyState, Markdown, Pill } from "@/shared/ui";
import { ApplyPanel } from "./apply-panel";

/**
 * 행사 상세 (SSR · wave2 D7).
 *
 * 서버에서 그려야 하는 이유가 OG 메타태그다 — 카카오톡·에브리타임에 링크를 붙이면 크롤러가
 * 자바스크립트를 돌리지 않고 첫 HTML만 읽는다. 같은 이유로 본문도 여기서 다 그린다.
 *
 * 게시되지 않은 행사(작성 중·보관)는 서버가 404로 답하고, 그때는 `notFound()`로 404 화면에
 * 넘긴다 — "권한이 없습니다"가 아니다. 공개 앱에는 권한이라는 개념이 없고, 없는 주소와
 * 아직 공개하지 않은 주소를 화면이 구별해 주면 게시 전 행사의 존재가 새어 나간다.
 */
export async function EventDetailPage({ eventId }: { eventId: number }) {
  let event: PublicEventDetail;
  try {
    event = await fetchPublicEvent(eventId);
  } catch (error) {
    if (isEventNotFound(error)) notFound();
    return (
      <div className="flex flex-col gap-[14px]">
        <BackLink />
        <EmptyState title={eventLoadErrorMessage(error)} />
      </div>
    );
  }

  const phase = eventPhaseBadge(event.eventPhase);
  const receipt = eventReceiptBadge(event.receiptStatus);

  return (
    <article className="flex flex-col gap-[14px]">
      <BackLink />

      {event.thmbUrlAddr && (
        /* 본문·카드와 같은 이유로 next/image 를 쓰지 않는다 (외부 URL) */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.thmbUrlAddr}
          alt=""
          className="h-[180px] w-full rounded-2xl bg-bg object-cover lg:h-[240px]"
        />
      )}

      <div className="flex flex-col items-start gap-[16px] lg:flex-row">
        <Card className="flex w-full flex-col gap-[10px] lg:flex-[1.9]">
          <div className="flex flex-wrap items-center gap-[6px]">
            {receipt && <Badge tone={receipt.tone}>{receipt.label}</Badge>}
            {phase && <Badge tone={phase.tone}>{phase.label}</Badge>}
            <Pill>{event.eventClsfNm}</Pill>
          </div>
          <h1 className="text-[22px] font-bold leading-[1.3] lg:text-[24px]">{event.eventTtl}</h1>
          {event.mtxtCn.trim() ? (
            <Markdown>{event.mtxtCn}</Markdown>
          ) : (
            <p className="text-[15px] text-n500">등록된 안내 내용이 없습니다</p>
          )}
        </Card>

        <div className="w-full lg:flex-1">
          <ApplyPanel event={event} />
        </div>
      </div>
    </article>
  );
}

function BackLink() {
  return (
    <Link href={ROUTES.events} className="text-[13.5px] text-accent-strong">
      ‹ 행사 목록
    </Link>
  );
}
