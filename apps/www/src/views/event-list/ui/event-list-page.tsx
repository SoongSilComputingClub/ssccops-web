import {
  eventLoadErrorMessage,
  fetchPublicEvents,
  toClassifications,
  type PublicEventSummary,
} from "@/entities/event";
import { EmptyState } from "@/shared/ui";
import { ClassificationFilter } from "./classification-filter";
import { EventCard } from "./event-card";

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
 */
export async function EventListPage({ eventClsfCd }: { eventClsfCd: string | null }) {
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
          숭실컴퓨팅클럽이 여는 모집 · 세미나 · 프로젝트 · 행사입니다
        </p>
      </header>

      {errorMessage ? (
        <EmptyState title={errorMessage} />
      ) : (
        <>
          <ClassificationFilter classifications={classifications} selected={eventClsfCd} />
          {events.length === 0 ? (
            <EmptyState
              title={
                eventClsfCd ? "이 분류에는 공개된 행사가 없습니다" : "공개된 행사가 없습니다"
              }
              description="새로운 행사가 열리면 이곳에 올라옵니다"
            />
          ) : (
            <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
              {events.map((event) => (
                <EventCard key={event.eventId} event={event} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
