import type { AcademicProgramSummary } from "@/entities/academic-program";
// 배럴을 거치지 않는다 — 배럴이 SSR 로더를 재export 하면 클라 번들이 오염된다(index.ts 주석)
import { fetchMyLeadingPrograms } from "@/entities/academic-program/api/programs-read";
import { fetchAuthSession } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui";
import { resolveGate } from "../model/gate";
import { AccountLine, GateNotice } from "./gate-notices";
import { MeFrame } from "./me-frame";
import { ProgramCard } from "./program-card";

/*
 * 내가 이끄는 스터디·프로젝트 (SSR · #574 · ssccops#428) — 허브 `/me`의 ④를 한 장으로.
 *
 * `GET /v1/academic-programs?mine=leader` 전량. 유형은 서버 값 그대로이고(`ProgramCard` 주석)
 * 카드는 lms 상세로 간다 — 회차·출석·팀원은 lms의 일이다(ssccops#386). 상태 필터는 두지 않는다 —
 * 한 사람이 맡는 활동은 대개 한두 건이라 거를 것이 없고, `APPROVED`는 배지도 없다.
 */
export async function MeProgramsPage() {
  return (
    <MeFrame
      pathname={ROUTES.mePrograms}
      description="스터디장·팀장으로 맡은 활동의 진행 상황을 확인할 수 있습니다"
    >
      <Body />
    </MeFrame>
  );
}

async function Body() {
  const [sessionResult, programsResult] = await Promise.allSettled([
    fetchAuthSession(),
    fetchMyLeadingPrograms(),
  ]);

  const gate = resolveGate(sessionResult, programsResult);
  if (gate.kind !== "ready") return <GateNotice gate={gate} next={ROUTES.mePrograms} />;

  return (
    <div className="flex flex-col gap-[12px]">
      <AccountLine session={gate.session} />
      {programsResult.status === "rejected" ? (
        <EmptyState title="활동을 불러오지 못했습니다 — 잠시 후 다시 시도해주세요" />
      ) : (
        <ProgramList programs={programsResult.value} />
      )}
    </div>
  );
}

/** 빈 목록은 실패가 아니다 — 스터디장/팀장이 아닌 부원이 대부분이라 «없음»이 흔한 상태다 */
function ProgramList({ programs }: Readonly<{ programs: AcademicProgramSummary[] }>) {
  if (programs.length === 0) return <EmptyState title="이끄는 활동이 없습니다" />;
  return (
    <div className="flex flex-col gap-[12px]">
      {programs.map((program) => (
        <ProgramCard key={program.academicProgramId} program={program} />
      ))}
    </div>
  );
}
