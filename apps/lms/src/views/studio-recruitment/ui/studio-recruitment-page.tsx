import { BackToProgramsNotice, ProgramSignupNotice } from "@/features/academic-program";
import { LoginGate } from "@/features/auth";
import { loadRecruitments } from "@/features/form/model/load-recruitments";
import { recruitmentPhaseOf } from "@/entities/form";
import type { AcademicProgramSummary } from "@/entities/academic-program";
import { EmptyState } from "@/shared/ui";
import { PhaseFilterChips, type PhaseFilter } from "./phase-filter";
import { RecruitmentCard } from "./recruitment-card";

/*
 * 모집 관리 (#528 · ssccops-server#483).
 *
 * ── 무엇을 하는 화면인가 ────────────────────────────────────
 * 스터디장·프로젝트장이 **자기가 맡은 활동의 지원서**를 찾아 들어가는 자리다. 그전까지 문항을
 * 채우는 길은 어드민 폼 편집기 하나뿐이었는데 리더에게는 그 권한이 없어(V3 시드가 두 역할에
 * 권한을 하나도 주지 않는다), 학술국장이 문항을 카톡으로 받아 대신 넣고 있었다.
 *
 * ── 왜 SSR인가 ────────────────────────────────────────────
 * 이 앱은 조회 화면을 서버 컴포넌트로 그린다(AGENTS.md). 필터도 주소로 받으므로 클라이언트
 * 상태가 없다 — 고치는 것은 다음 화면(`views/recruitment-form`)의 일이다.
 *
 * ── 모집 일정을 이 화면에서 바꾸지 않는다 ──────────────────
 * 접수 시작·종료 일시는 학술국장이 어드민 «모집 관리»의 `START_RECRUITMENT` 전이로 정한다
 * (#528 요구 3). 카드는 그 값을 **읽기 전용**으로 보여 주기만 한다 — 서버도 리더 경로의
 * 본문에서 접수 기간을 받지 않는다.
 */

export async function StudioRecruitmentPage({
  phase,
}: Readonly<{
  /** 주소의 `?phase=` — 없으면 «전체» */
  phase: PhaseFilter;
}>) {
  const load = await loadRecruitments();

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">모집 관리</h1>
        <p className="text-[13.5px] text-n500">
          내가 낸 기획안이 승인돼 모집이 열린 스터디·프로젝트입니다. 모집 일정은 학술국장이 정합니다.
        </p>
      </header>

      {load.outcome === "unauthenticated" && (
        <LoginGate
          title="로그인이 필요합니다"
          description="모집 관리는 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해주세요"
        />
      )}
      {load.outcome === "signup-required" && <ProgramSignupNotice />}
      {load.outcome === "none" && (
        <EmptyState
          title="모집을 시작한 활동이 없습니다"
          description="기획안이 승인되면 이 자리에 지원서가 생깁니다."
        />
      )}
      {load.outcome === "error" && (
        <BackToProgramsNotice title="모집 목록을 불러오지 못했습니다" description={load.message} />
      )}

      {load.outcome === "ready" && (
        <RecruitmentList programs={load.programs} phase={phase} />
      )}
    </div>
  );
}

function RecruitmentList({
  programs,
  phase,
}: Readonly<{
  programs: AcademicProgramSummary[];
  phase: PhaseFilter;
}>) {
  /*
   * 건수는 **거르기 전 전체**를 기준으로 센다 — 고른 뒤에 세면 다른 칩이 전부 0이 되어
   * 무엇이 있는지 알 수 없다.
   */
  const counts = {
    all: programs.length,
    before: 0,
    open: 0,
    closed: 0,
  };
  for (const program of programs) {
    counts[recruitmentPhaseOf(program.formReceiptStatus ?? "DRAFT")] += 1;
  }

  const shown =
    phase === "all"
      ? programs
      : programs.filter(
          (program) => recruitmentPhaseOf(program.formReceiptStatus ?? "DRAFT") === phase,
        );

  return (
    <>
      <PhaseFilterChips active={phase} counts={counts} />

      {shown.length === 0 ? (
        <EmptyState title="이 상태에 해당하는 활동이 없습니다" />
      ) : (
        <div className="flex flex-col gap-[12px]">
          {shown.map((program) => (
            <RecruitmentCard key={program.academicProgramId} program={program} />
          ))}
        </div>
      )}
    </>
  );
}
