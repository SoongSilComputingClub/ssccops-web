import Link from "next/link";
import {
  eventReceiptBadge,
  fetchPublicEvents,
  groupByProgramType,
  onlyAcademicPrograms,
  type PublicEventSummary,
} from "@/entities/event";
import { ROUTES } from "@/shared/config/routes";
import { formatEventPeriod } from "@/shared/lib/date";
import {
  Badge,
  COMPACT_CARD_CLASS,
  EmptyState,
  ListCell,
  ListRow,
  ListTable,
  Pill,
} from "@/shared/ui";

/**
 * 학술 페이지의 «모집 중인 학술 프로그램» (#587 · ssccops#435 · ADR-0043) — 리스트형 (#591 · ssccops#439).
 *
 * 공개 행사 목록에서 `academicProgram`이 있는 것(스터디·프로젝트·트랙)만 골라 세운다 — `/events`가
 * 뺀 것이 여기로 온다(www의 축은 각각 한 종류의 데이터를 본다). 학술 도메인에 공개 목록 API를
 * 따로 열지 않은 것은 신청이 어차피 행사 신청 화면(폼)이라 두 축이 같은 건을 가리키기 때문이다
 * (ADR-0043 «C 기각»). 상세도 기존 행사 상세다.
 *
 * ── 카드가 아니라 표다 ──────────────────────────────────────
 * #587은 유형별로 묶어 `EventCard`를 두 열로 세웠다. 그런데 프로그램은 «무엇이 열려 있고 언제까지
 * 신청하나»를 훑는 목록이지 이미지를 볼 목록이 아니고(대표 이미지가 있는 프로그램도 드물다),
 * 학기 초에는 스터디만 열 건이 넘어 카드 격자가 한 화면을 다 먹었다(ssccops#439). 한 줄에
 * 유형 · 제목 · 모집 · 기간 — `/events?view=list`와 같은 틀(`shared/ui/list-table.tsx`)이고
 * lg 미만은 같은 데이터가 카드로 접힌다.
 *
 * **열은 목록 계약에 있는 것만이다.** 접수 기간(`rcptBgngDt`·`rcptEndDt`)과 정원·확정
 * (`ptcpLmtCnt`·`confirmedCount`)은 `PublicEventSummary`에 없다 — 기간 열은 행사 기간이고, 정원
 * 열은 없다(없는 값을 만들어 내지 않는다 · `EventTable`과 같은 판단). 서버가 목록에 실어 주면
 * 그때 열을 더한다. «모집»은 폼의 접수 상태(`receiptStatus`) 배지 — 폼이 없는 프로그램은 칸이 빈다.
 *
 * 유형별 묶음 제목은 걷었다 — 유형이 열이 되면 묶음 제목이 같은 말을 두 번 한다. 줄 순서는
 * 종전대로 서버 목록에서 먼저 나온 유형이 먼저이고 유형 안에서는 목록 순서다(`groupByProgramType`을
 * 평탄화 — 이름순으로 다시 세우지 않는다).
 *
 * ── 조회 실패는 절을 통째로 감춘다 ──────────────────────────
 * 이 절은 페이지 본문(`ContentPage`)에 딸린 부속이다. 목록을 못 받았을 때 오류 한 줄을 본문 아래
 * 세우면 «학술 프로그램이 어떻게 돌아가는가»를 읽으러 온 사람이 오류를 먼저 본다 — 홈 배너가
 * 실패를 «없음»으로 그리는 것과 같은 판단이다. 받았는데 비었으면 빈 상태 한 줄(그것은 정상
 * 상태다). 세션은 보지 않는다(익명 캐시 · `AcademicCta`와 같다).
 */
export async function AcademicPrograms() {
  let programs: PublicEventSummary[];
  try {
    programs = groupByProgramType(onlyAcademicPrograms(await fetchPublicEvents())).flatMap(
      (group) => group.events,
    );
  } catch {
    return null;
  }

  return (
    <section className="flex flex-col gap-[12px]">
      <h2 className="text-[19px] font-semibold tracking-[-.2px]">모집 중인 학술 프로그램</h2>
      {programs.length === 0 ? (
        <EmptyState title="지금 모집 중인 학술 프로그램이 없습니다" />
      ) : (
        <ListTable
          columns="lg:grid-cols-[100px_minmax(0,1.6fr)_110px_minmax(0,1.2fr)]"
          headers={["유형", "제목", "모집", "기간"]}
          compact={programs.map((program) => (
            <ProgramCompactCard key={program.eventId} program={program} />
          ))}
        >
          {programs.map((program) => (
            <ProgramRow key={program.eventId} program={program} />
          ))}
        </ListTable>
      )}
    </section>
  );
}

/** 표의 한 행 — 유형 · 제목 · 모집 · 기간. `academicProgram`은 `onlyAcademicPrograms`가 보장한다 */
function ProgramRow({ program }: Readonly<{ program: PublicEventSummary }>) {
  const receipt = eventReceiptBadge(program.receiptStatus);
  const period = formatEventPeriod(program.eventBgngDt, program.eventEndDt);

  return (
    <ListRow>
      <ListCell>
        <Pill>{program.academicProgram?.typeNm}</Pill>
      </ListCell>
      <ListCell>
        <Link
          href={ROUTES.eventDetail(program.eventId)}
          className="font-medium text-ink transition-colors hover:text-accent-strong"
        >
          {program.eventTtl}
        </Link>
      </ListCell>
      <ListCell>{receipt && <Badge tone={receipt.tone}>{receipt.label}</Badge>}</ListCell>
      {/* 기간은 연도까지 적어 길다 — 이 칸만 줄바꿈을 허용한다 */}
      <ListCell wrap muted>
        {period}
      </ListCell>
    </ListRow>
  );
}

/** 좁은 화면의 한 장 — 같은 네 값을 세 줄로. 카드 전체가 링크다 */
function ProgramCompactCard({ program }: Readonly<{ program: PublicEventSummary }>) {
  const receipt = eventReceiptBadge(program.receiptStatus);
  const period = formatEventPeriod(program.eventBgngDt, program.eventEndDt);

  return (
    <Link href={ROUTES.eventDetail(program.eventId)} className={COMPACT_CARD_CLASS}>
      {receipt && (
        <div>
          <Badge tone={receipt.tone}>{receipt.label}</Badge>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-[8px]">
        <span className="text-[16px] font-semibold leading-[1.35]">{program.eventTtl}</span>
        <Pill>{program.academicProgram?.typeNm}</Pill>
      </div>
      {period && <span className="text-[13.5px] text-n500">{period}</span>}
    </Link>
  );
}
