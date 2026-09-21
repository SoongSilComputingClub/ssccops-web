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
import { organizationJsonLd, siteOrigin } from "@/shared/config/site";
import { Badge, Card, EmptyState, JsonLd, Markdown, Pill } from "@/shared/ui";
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
 *
 * `Event` JSON-LD(#602 · ssccops#444)도 같은 이유로 여기서 그린다 — 크롤러가 읽는 첫 HTML에
 * 있어야 한다. 서버가 준 값만 싣는다(`eventJsonLd`): 일시·장소가 없으면 그 키가 없다.
 * **접수 상태·정원·마감은 싣지 않는다** — 공유 카드와 같은 규칙(AGENTS «공유 카드»)이고,
 * 검색 결과 스니펫도 한 번 굳으면 오래 남는다.
 */
export async function EventDetailPage({ eventId }: Readonly<{ eventId: number }>) {
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
      <JsonLd data={eventJsonLd(event)} />
      <BackLink />

      {event.thmbUrlAddr && (
        /* 본문·카드와 같은 이유로 next/image 를 쓰지 않는다 (외부 URL) */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.thmbUrlAddr}
          alt=""
          /*
           * 목록 카드와 같은 정사각형 틀 (ssccops#273).
           *
           * 폭을 묶는 것이 여기서만 필요하다 — 상세는 이미지가 본문 전체 폭을 차지해서,
           * 1:1을 그대로 두면 넓은 화면에서 높이가 화면을 통째로 덮고 정작 읽을 본문이
           * 첫 화면 밖으로 밀린다.
           */
          className="aspect-square w-full max-w-[320px] rounded-2xl bg-bg object-cover lg:max-w-[400px]"
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

/**
 * schema.org `Event` — 이름·일시·장소·대표 이미지·주최(동아리)·주소. 오리진을 모르면 `url`과
 * 주최의 `url`·`logo`가 빠진다(없는 값을 만들지 않는다). 본문 요약은 `generateMetadata`의
 * description이 이미 내고 있어 여기 다시 싣지 않는다.
 */
function eventJsonLd(event: PublicEventDetail): Record<string, unknown> {
  const origin = siteOrigin();
  return {
    "@type": "Event",
    name: event.eventTtl,
    ...(event.eventBgngDt ? { startDate: event.eventBgngDt } : {}),
    ...(event.eventEndDt ? { endDate: event.eventEndDt } : {}),
    ...(event.plcNm ? { location: { "@type": "Place", name: event.plcNm } } : {}),
    ...(event.thmbUrlAddr ? { image: event.thmbUrlAddr } : {}),
    ...(origin ? { url: `${origin}${ROUTES.eventDetail(event.eventId)}` } : {}),
    organizer: organizationJsonLd(origin),
  };
}

function BackLink() {
  return (
    <Link
      href={ROUTES.events}
      className="-my-1 inline-flex min-h-6 items-center self-start py-1 text-[13.5px] text-accent-strong"
    >
      ‹ 행사 목록
    </Link>
  );
}
