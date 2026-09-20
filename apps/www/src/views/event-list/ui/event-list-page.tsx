import {
  EventCard,
  eventLoadErrorMessage,
  fetchPublicEvents,
  toClassifications,
  type PublicEventSummary,
} from "@/entities/event";
import type { EventListView } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui";
import { ClassificationFilter } from "./classification-filter";
import { EventTable } from "./event-table";
import { ViewSwitch } from "./view-switch";

/**
 * 행사 목록 (SSR).
 *
 * 조회를 **두 번** 한다. 하나는 필터를 건 목록이고 다른 하나는 필터 칩을 세우기 위한 전체
 * 목록이다 — 공개 분류 목록 엔드포인트가 계약에 없어(entities/event/api 참고) 실제로 게시된
 * 행사에서 분류를 뽑는데, 필터를 건 응답에서 뽑으면 칩을 누르는 순간 나머지 칩이 사라진다.
 * 두 요청은 나란히 보낸다.
 *
 * 조회 실패를 던지지 않고 화면 안에서 안내로 그리는 것은, 서버가 잠깐 닿지 않을 때 공개
 * 도메인이 통째로 오류 화면이 되는 편보다 낫기 때문이다.
 *
 * 보기 방식(`view` · #573 · ssccops#427)은 주소(`?view=list`)에서 온다 — 왜 URL인지는
 * `shared/config/routes.ts`의 `EventListView`. 카드·리스트는 같은 목록을 다르게 그릴 뿐이라
 * 조회·필터·빈 상태는 갈리지 않는다.
 */
export async function EventListPage({
  eventClsfCd,
  view,
}: Readonly<{
  eventClsfCd: string | null;
  view: EventListView;
}>) {
  let events: PublicEventSummary[] = [];
  let all: PublicEventSummary[] = [];
  let errorMessage: string | null = null;

  try {
    const [filtered, unfiltered] = await Promise.all([
      fetchPublicEvents(eventClsfCd),
      eventClsfCd ? fetchPublicEvents() : null,
    ]);
    events = filtered;
    all = unfiltered ?? filtered;
  } catch (error) {
    errorMessage = eventLoadErrorMessage(error);
  }

  const classifications = toClassifications(all);

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">동아리 행사</h1>
        <p className="text-[13.5px] text-n500">
          SSCC가 여는 모집·세미나·프로젝트·행사
        </p>
      </header>

      {errorMessage ? (
        <EmptyState title={errorMessage} />
      ) : (
        <>
          {/* 필터 줄 — 왼쪽 분류 칩, 오른쪽 보기 전환. 칩이 없어도(분류 하나) 전환은 오른쪽에 남는다 */}
          <div className="flex flex-wrap items-center justify-between gap-[10px]">
            <ClassificationFilter
              classifications={classifications}
              selected={eventClsfCd}
              view={view}
            />
            <div className="ml-auto">
              <ViewSwitch view={view} eventClsfCd={eventClsfCd} />
            </div>
          </div>
          {events.length === 0 ? (
            <EmptyState
              title={
                eventClsfCd ? "이 분류에는 공개된 행사가 없습니다" : "공개된 행사가 없습니다"
              }
              description="새로운 행사가 열리면 이곳에 올라옵니다"
            />
          ) : (
            <EventList events={events} view={view} />
          )}
        </>
      )}
    </div>
  );
}

/** 같은 목록을 보기 방식대로 — 리스트면 표(`EventTable`), 아니면 카드 격자 */
function EventList({
  events,
  view,
}: Readonly<{
  events: PublicEventSummary[];
  view: EventListView;
}>) {
  if (view === "list") return <EventTable events={events} />;
  return (
    <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
      {events.map((event) => (
        <EventCard key={event.eventId} event={event} />
      ))}
    </div>
  );
}
