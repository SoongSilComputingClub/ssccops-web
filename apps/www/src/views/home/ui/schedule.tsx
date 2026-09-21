import Link from "next/link";
import type { ReactNode } from "react";
import {
  eventPhaseBadge,
  excludeAcademicPrograms,
  type PublicEventSummary,
} from "@/entities/event";
import { ROUTES } from "@/shared/config/routes";
import { formatEventDate } from "@/shared/lib/date";
import { Badge, Card } from "@/shared/ui";
import { Dash } from "./dash";

/** 일정은 다섯 줄까지 — 전체는 «행사 전체 보기»(`/events`) */
const MAX_ROWS = 5;

/**
 * 다가오는 일정 — 진행 중·예정 행사 (#524 · ssccops#385 → #529 · ssccops#389).
 *
 * 행사만이다. #524에서는 접수 중인 폼(`/public/v1/forms/open`)도 같은 목록에 세웠는데, 2026-09-19
 * 검토에서 «일정 자리에 폼 목록은 어울리지 않는다»(ssccops#389) — 폼은 QA 폼까지 전부 «접수
 * 중»으로 떠서 일정이 아니라 폼 목록이 됐다. 모집 안내는 홈 배너(`home-banner`)의 자리다.
 *
 * 공개 목록에서 `eventPhase`가 `ONGOING`·`UPCOMING`인 것을 시작일 순으로 다섯까지 — 단계는
 * 서버가 판정한 값이고(`eventPhaseBadge`가 칩을 만든다) 웹은 거르고 정렬만 한다. 서버 목록에
 * «예정만» 필터가 없어 웹이 거르는 것은 학기별 묶음과 같은 판단.
 *
 * ── 빈 줄과 «—»를 가른다 ────────────────────────────────────
 * 받았는데 비었으면 «예정된 행사가 없습니다» — 학기 중 대부분의 날에 정상이다. 못 받았으면
 * «—»다 — 무엇이 있었는지 모르면서 «없다»고 말하지 않는다.
 *
 * 행사 카드(`EventCard`)를 다시 쓰지 않는 것은 이 자리가 목록이 아니라 일정이라서다 — 이미지
 * 없이 칩과 제목 한 줄이면 되고, 카드가 서면 hero 아래가 목록 화면이 된다.
 */
export function Schedule({
  events,
}: Readonly<{
  events: PromiseSettledResult<PublicEventSummary[]>;
}>) {
  if (events.status === "rejected") return <Section body={<Dash />} />;

  const rows = scheduledEvents(events.value);
  if (rows.length === 0) {
    return <Section body={<p className="text-[14.5px] text-n500">예정된 행사가 없습니다</p>} />;
  }
  return (
    <Section
      body={
        <ul className="flex flex-col divide-y divide-line">
          {rows.map((event) => {
            const badge = eventPhaseBadge(event.eventPhase);
            return (
              <li key={event.eventId}>
                <Link
                  href={ROUTES.eventDetail(event.eventId)}
                  className="flex items-center gap-[10px] py-[12px] text-ink hover:text-accent-strong"
                >
                  {badge && (
                    <span className="flex-none">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[15.5px] font-medium">
                    {event.eventTtl}
                  </span>
                  <span className="flex-none text-[13.5px] text-n500">
                    {formatEventDate(event.eventBgngDt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      }
    />
  );
}

function Section({ body }: Readonly<{ body: ReactNode }>) {
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

/**
 * 진행 중·예정 행사를 시작일 순으로 — 시작 일시가 없는 행사는 서버가 `NONE`으로 주므로 여기서 빠진다.
 *
 * 학술 프로그램(`academicProgram`이 있는 것)도 뺀다 (#587 · ssccops#435 · ADR-0043) — 이 자리는
 * `/events`와 같은 행사 축이라 행사형만 본다. 스터디·프로젝트 모집은 학술(`/academic`)의 자리다.
 */
function scheduledEvents(events: PublicEventSummary[]): PublicEventSummary[] {
  return excludeAcademicPrograms(events)
    .filter((event) => event.eventPhase === "ONGOING" || event.eventPhase === "UPCOMING")
    .sort((a, b) => (a.eventBgngDt ?? "").localeCompare(b.eventBgngDt ?? ""))
    .slice(0, MAX_ROWS);
}
