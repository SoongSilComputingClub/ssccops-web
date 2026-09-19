import Link from "next/link";
import {
  contentLoadErrorMessage,
  fetchPublicPostsInSemester,
  formatSemester,
  isInSemester,
  PostCard,
  type PublicContentPostSummary,
  type SemesterRange,
} from "@/entities/content";
import {
  EventCard,
  eventLoadErrorMessage,
  fetchPublicEvents,
  type PublicEventSummary,
} from "@/entities/event";
import { ROUTES } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui";

/**
 * 학기별 묶음 (SSR · #520 · ssccops#382) — `/activities/2026/1`의 포스트와 행사.
 *
 * 서버에 학기 개념이 없어 **웹이 활동일로 걸러 낸다** — 포스트는 `actv_ymd`, 행사는 시작
 * 일시(`eventBgngDt`). 1학기 = 3~8월, 2학기 = 9월~이듬해 2월(`entities/content/model/semester.ts`).
 * 두 조회는 나란히 보내고 한쪽이 실패해도 그쪽 블록만 안내로 그린다(`/me`와 같은 판단).
 *
 * 이웃 학기로 가는 링크를 위아래에 둔다 — 아카이브를 학기 단위로 훑는 것이 이 화면의 쓰임이다.
 */
export async function SemesterPage({ range }: Readonly<{ range: SemesterRange }>) {
  const [postsResult, eventsResult] = await Promise.allSettled([
    fetchPublicPostsInSemester(range),
    fetchPublicEvents(),
  ]);

  const prev: SemesterRange =
    range.semester === 1
      ? { ...range, year: range.year - 1, semester: 2 }
      : { ...range, semester: 1 };
  const next: SemesterRange =
    range.semester === 1
      ? { ...range, semester: 2 }
      : { ...range, year: range.year + 1, semester: 1 };

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">
          {formatSemester(range)}
        </h1>
        <p className="text-[13.5px] text-n500">이 학기에 있었던 활동 기록과 행사입니다.</p>
      </header>

      <SemesterNav prev={prev} next={next} />

      <PostsBlock result={postsResult} />
      <EventsBlock result={eventsResult} range={range} />

      <SemesterNav prev={prev} next={next} />
    </div>
  );
}

function SemesterNav({ prev, next }: Readonly<{ prev: SemesterRange; next: SemesterRange }>) {
  return (
    <nav aria-label="학기 이동" className="flex items-center justify-between text-[13.5px]">
      <Link
        href={ROUTES.activitiesSemester(prev.year, prev.semester)}
        className="text-accent-strong"
      >
        ‹ {formatSemester(prev)}
      </Link>
      <Link href={ROUTES.activities} className="text-n400 hover:text-ink">
        전체 활동
      </Link>
      <Link
        href={ROUTES.activitiesSemester(next.year, next.semester)}
        className="text-accent-strong"
      >
        {formatSemester(next)} ›
      </Link>
    </nav>
  );
}

function PostsBlock({
  result,
}: Readonly<{ result: PromiseSettledResult<PublicContentPostSummary[]> }>) {
  let body;
  if (result.status === "rejected") {
    body = <EmptyState title={contentLoadErrorMessage(result.reason)} />;
  } else if (result.value.length === 0) {
    body = <EmptyState title="이 학기의 활동 기록이 없습니다" />;
  } else {
    body = (
      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
        {result.value.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-[10px]">
      <h2 className="text-[17px] font-semibold">활동 기록</h2>
      {body}
    </section>
  );
}

function EventsBlock({
  result,
  range,
}: Readonly<{ result: PromiseSettledResult<PublicEventSummary[]>; range: SemesterRange }>) {
  let body;
  if (result.status === "rejected") {
    body = <EmptyState title={eventLoadErrorMessage(result.reason)} />;
  } else {
    const events = result.value.filter((event) => isInSemester(event.eventBgngDt, range));
    body =
      events.length === 0 ? (
        <EmptyState title="이 학기의 행사가 없습니다" />
      ) : (
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.eventId} event={event} />
          ))}
        </div>
      );
  }

  return (
    <section className="flex flex-col gap-[10px]">
      <h2 className="text-[17px] font-semibold">행사</h2>
      {body}
    </section>
  );
}
