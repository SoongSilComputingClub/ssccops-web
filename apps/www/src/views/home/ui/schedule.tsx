import Link from "next/link";
import type { ReactNode } from "react";
import type { PublicOpenForm } from "@/entities/content";
import type { PublicEventSummary } from "@/entities/event";
import { ROUTES } from "@/shared/config/routes";
import { ddayLabel, formatEventDate } from "@/shared/lib/date";
import { Badge, Card } from "@/shared/ui";
import { Dash } from "./dash";

/** 예정 행사는 셋까지 — 전체는 «행사 전체 보기»(`/events`) */
const UPCOMING_EVENTS = 3;

/**
 * 다가오는 일정 — 접수 중인 폼 + 예정 행사 (#524 · ssccops#385).
 *
 * 폼은 `/public/v1/forms/open`(제목 · 마감 · 폼 키 — ADR-0038)이고 «접수 중» 칩에 마감이 있으면
 * D-n을 붙인다. 행사는 공개 목록에서 **시작이 오늘 이후인 것**만 시작일 순으로 셋 — 서버
 * 목록에 «예정만» 필터가 없어 웹이 거른다(학기별 묶음과 같은 판단). 오늘을 서울 기준으로 세는
 * 것은 `todayInSeoul`이고 D-n도 그 기준이다.
 *
 * ── 빈 줄과 «—»를 가른다 ────────────────────────────────────
 * 둘 다 받았는데 둘 다 비었으면 «지금 열린 것이 없습니다» — 모집 기간이 아니면 정상이다.
 * 한쪽이라도 못 받았고 보일 것이 없으면 «—»다 — 못 받은 쪽에 무엇이 있었는지 모르면서 «없다»고
 * 말하지 않는다. 한쪽을 못 받았어도 다른 쪽에 항목이 있으면 그것만 그린다.
 *
 * 행사 카드(`EventCard`)를 다시 쓰지 않는 것은 이 자리가 목록이 아니라 일정이라서다 — 이미지
 * 없이 날짜 칩과 제목 한 줄이면 되고, 카드 셋이 서면 hero 아래가 목록 화면이 된다.
 */
export function Schedule({
  forms,
  events,
  today,
}: Readonly<{
  forms: PromiseSettledResult<PublicOpenForm[]>;
  events: PromiseSettledResult<PublicEventSummary[]>;
  /** `YYYY-MM-DD`(서울) — 예정 판정과 D-n의 기준일 */
  today: string;
}>) {
  const openForms = forms.status === "fulfilled" ? forms.value : [];
  const upcoming = events.status === "fulfilled" ? upcomingEvents(events.value, today) : [];
  const failed = forms.status === "rejected" || events.status === "rejected";
  const empty = openForms.length === 0 && upcoming.length === 0;

  let body;
  if (empty && failed) {
    body = <Dash />;
  } else if (empty) {
    body = <p className="text-[14.5px] text-n500">지금 열린 것이 없습니다</p>;
  } else {
    body = (
      <ul className="flex flex-col divide-y divide-line">
        {openForms.map((form) => (
          <Row
            key={form.formKey}
            href={ROUTES.publicForm(form.formKey)}
            chip={<Badge tone="blue">접수 중</Badge>}
            aside={ddayLabel(form.rcptEndDt, today)}
            title={form.formTtlNm}
          />
        ))}
        {upcoming.map((event) => (
          <Row
            key={event.eventId}
            href={ROUTES.eventDetail(event.eventId)}
            chip={<Badge tone="outline">예정</Badge>}
            aside={formatEventDate(event.eventBgngDt)}
            title={event.eventTtl}
          />
        ))}
      </ul>
    );
  }

  return (
    <section className="flex flex-col gap-[12px]">
      <div className="flex items-baseline justify-between gap-[10px]">
        <h2 className="text-[19px] font-semibold tracking-[-.2px]">다가오는 일정</h2>
        <Link href={ROUTES.events} className="text-[14px] text-accent-strong">
          행사 전체 보기 ›
        </Link>
      </div>
      <Card className="px-[16px] py-[4px] lg:px-[18px]">{body}</Card>
    </section>
  );
}

/** 시작이 오늘 이후인 행사를 시작일 순으로 셋까지 — 시작 일시가 없는 행사는 예정이라 말할 수 없어 뺀다 */
function upcomingEvents(events: PublicEventSummary[], today: string): PublicEventSummary[] {
  return events
    .filter((event) => event.eventBgngDt && event.eventBgngDt.slice(0, 10) >= today)
    .sort((a, b) => (a.eventBgngDt ?? "").localeCompare(b.eventBgngDt ?? ""))
    .slice(0, UPCOMING_EVENTS);
}

/** 일정 한 줄 — 칩 · 제목 · 오른쪽에 날짜(D-n 또는 시작일). 줄 전체가 링크다 */
function Row({
  href,
  chip,
  aside,
  title,
}: Readonly<{
  href: string;
  chip: ReactNode;
  /** 오른쪽 보조 글자 — 없으면 자리를 비운다 */
  aside: string | null;
  title: string;
}>) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-[10px] py-[12px] text-ink hover:text-accent-strong"
      >
        <span className="flex-none">{chip}</span>
        <span className="min-w-0 flex-1 truncate text-[15.5px] font-medium">{title}</span>
        {aside && <span className="flex-none text-[13.5px] text-n500">{aside}</span>}
      </Link>
    </li>
  );
}
