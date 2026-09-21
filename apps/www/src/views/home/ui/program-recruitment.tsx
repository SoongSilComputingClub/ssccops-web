import Link from "next/link";
import type { PublicEventSummary } from "@/entities/event";
import { ROUTES } from "@/shared/config/routes";
import { AcademicProgramList, orderPrograms } from "@/views/content-page";

/** 홈에는 다섯 줄까지 — 전체는 «학술 전체 보기»(`/academic`). 일정 절의 다섯 줄과 같은 판단 */
const HOME_PROGRAM_ROWS = 5;

/**
 * 홈의 «학술 프로그램 모집» (#595 · ssccops#441).
 *
 * «다가오는 일정»이 행사형만 보게 되면서(ADR-0043 · #587) 학술 프로그램 모집은 «학술» 축에 들어가야
 * 보였다. 학기 초에 부원이 가장 먼저 찾는 것이 그것이라 홈에도 같은 표를 세운다 — 표는
 * `AcademicProgramList` 한 벌이고(학술 페이지와 같다), 재료는 홈이 이미 받아 둔 `events`라 조회가
 * 늘지 않는다.
 *
 * **접수 중·접수 예정만, 하나도 없으면 절 자체가 없다.** 학술 페이지는 «지금 모집 중인 프로그램이
 * 없습니다»를 세우지만(그 페이지의 주제라 빈 상태도 정보다), 홈은 빈 절을 두지 않는다 — 학기 중
 * 대부분의 날에 모집이 없고, 그때 «없습니다» 한 줄은 홈에서 자리만 차지한다(일정 절이 빈 줄을
 * 세우는 것과 다른 판단인 이유: 일정은 홈의 고정 골격이고 이 절은 계절 절이다). 조회 실패도 같은
 * 이유로 절을 감춘다.
 */
export function ProgramRecruitment({
  events,
}: Readonly<{
  events: PromiseSettledResult<PublicEventSummary[]>;
}>) {
  if (events.status === "rejected") return null;
  const rows = orderPrograms(events.value)
    .filter((e) => e.receiptStatus === "ACCEPTING" || e.receiptStatus === "SCHEDULED")
    .slice(0, HOME_PROGRAM_ROWS);
  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-[12px]">
      <div className="flex items-baseline justify-between gap-[10px]">
        <h2 className="text-[19px] font-semibold tracking-[-.2px]">학술 프로그램 모집</h2>
        <Link
          href={ROUTES.academic}
          className="text-[13.5px] text-accent-strong hover:underline underline-offset-2"
        >
          학술 전체 보기 ›
        </Link>
      </div>
      <AcademicProgramList programs={rows} />
    </section>
  );
}
