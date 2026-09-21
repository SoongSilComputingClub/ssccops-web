import {
  EventCard,
  fetchPublicEvents,
  groupByProgramType,
  onlyAcademicPrograms,
  type AcademicProgramGroup,
} from "@/entities/event";
import { EmptyState, Pill } from "@/shared/ui";

/**
 * 학술 페이지의 «모집 중인 학술 프로그램» (#587 · ssccops#435 · ADR-0043).
 *
 * 공개 행사 목록에서 `academicProgram`이 있는 것(스터디·프로젝트·트랙)만 골라 **유형별로 묶어**
 * 세운다 — `/events`가 뺀 것이 여기로 온다(www의 축은 각각 한 종류의 데이터를 본다). 학술
 * 도메인에 공개 활동 목록 API를 따로 열지 않은 것은 신청이 어차피 행사 신청 화면(폼)이라 두 축이
 * 같은 건을 가리키기 때문이다(ADR-0043 «C 기각»). 카드는 행사 카드 그대로이고 상세도 기존 행사
 * 상세다 — 접수 배지(`receiptStatus`)가 «지금 신청할 수 있는가»를, 유형 칩이 무엇인지를 말한다.
 *
 * 묶음 순서는 서버 목록에서 먼저 나온 유형이 먼저(`groupByProgramType`) — 이름순으로 다시 세우지
 * 않는다.
 *
 * ── 조회 실패는 절을 통째로 감춘다 ──────────────────────────
 * 이 절은 페이지 본문(`ContentPage`)에 딸린 부속이다. 목록을 못 받았을 때 오류 한 줄을 본문 아래
 * 세우면 «학술 활동이 어떻게 돌아가는가»를 읽으러 온 사람이 오류를 먼저 본다 — 홈 배너가 실패를
 * «없음»으로 그리는 것과 같은 판단이다. 받았는데 비었으면 빈 상태 한 줄(그것은 정상 상태다).
 * 세션은 보지 않는다(익명 캐시 · `AcademicCta`와 같다).
 */
export async function AcademicPrograms() {
  let groups: AcademicProgramGroup[];
  try {
    groups = groupByProgramType(onlyAcademicPrograms(await fetchPublicEvents()));
  } catch {
    return null;
  }

  return (
    <section className="flex flex-col gap-[12px]">
      <h2 className="text-[19px] font-semibold tracking-[-.2px]">모집 중인 학술 프로그램</h2>
      {groups.length === 0 ? (
        <EmptyState title="지금 모집 중인 학술 프로그램이 없습니다" />
      ) : (
        groups.map((group) => <ProgramGroup key={group.typeCd} group={group} />)
      )}
    </section>
  );
}

/** 유형 하나 — 유형 칩(이름 · 건수)과 그 아래 카드 격자(`/events`와 같은 두 열) */
function ProgramGroup({ group }: Readonly<{ group: AcademicProgramGroup }>) {
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex items-center gap-[8px]">
        <Pill>{group.typeNm}</Pill>
        <span className="text-[13.5px] text-n500">{group.events.length}건</span>
      </div>
      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
        {group.events.map((event) => (
          <EventCard key={event.eventId} event={event} />
        ))}
      </div>
    </div>
  );
}
