import {
  BackToProgramsNotice,
  NoProgramNotice,
  ProgramSignupNotice,
  selectProgram,
} from "@/features/academic-program";
import { ProgramSwitcher } from "@/features/academic-program/ui/program-switcher";
import { loadAttendanceRoster } from "@/features/academic-session";
import { LoginGate } from "@/features/auth";
import { ROUTES, signupUrl } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui";
import { AttendanceRosterMatrix } from "./attendance-roster-matrix";

/*
 * 출석부 — 회차별 참석 현황 행렬 (#172 · #192 · ssccops-server#135·#137).
 *
 * ── 무엇을 하는 화면인가 ────────────────────────────────────────
 * 스터디장이 자기 활동의 **행이 팀원, 열이 회차**인 출석 행렬을 한 표로 본다. 칸을 눌러 출석을
 * 정정할 수 있다(APPROVED 회차는 잠긴다).
 *
 * ── 왜 SSR 셸 + 클라이언트 표인가 ─────────────────────────────────
 * 이 앱은 조회를 서버 컴포넌트로 그린다(AGENTS.md · #128·#131). "누가 팀원인가·회차가 몇
 * 개인가·각 회차 출석"은 서버에서 모으고(`loadAttendanceRoster`), 칸을 눌러 정정하는
 * 상호작용만 클라이언트다.
 *
 * ── 활동을 어떻게 고르는가 (#192) ──────────────────────────────────
 * 상단 활동 선택 드롭다운(`ProgramSwitcher`)으로 고른다. 첫 진입은 목록 맨 위 활동이 디폴트.
 * `?programId=`가 있으면 그 활동, 없으면 맨 위 — 어느 쪽이든 드롭다운으로 언제든 바꾼다.
 * SSR 셸이 `mine=true` 목록 전체(드롭다운 항목)와 선택 활동을 함께 받는다(`selectProgram`).
 */

export async function AttendanceRosterPage({
  academicProgramId,
}: {
  /** 주소의 ?programId= 값. 숫자가 아니거나 없으면 null → 목록 맨 위 */
  academicProgramId: number | null;
}) {
  const selection = await selectProgram(academicProgramId);

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">출석부</h1>
        <p className="text-[13.5px] text-n500">
          회차별 참석 현황입니다 — 칸을 눌러 출석을 고칠 수 있습니다. 승인된 회차는 잠깁니다
        </p>
      </header>

      {selection.outcome === "unauthenticated" && (
        <LoginGate
          title="로그인이 필요합니다"
          description="출석부는 활동의 스터디장만 볼 수 있습니다 — 구글 계정으로 로그인해 주세요"
        />
      )}
      {selection.outcome === "signup-required" && (
        <ProgramSignupNotice signupHref={signupUrl()} />
      )}
      {selection.outcome === "none" && <NoProgramNotice />}
      {selection.outcome === "error" && (
        <BackToProgramsNotice
          title="출석부를 불러오지 못했습니다"
          description={selection.message}
        />
      )}
      {selection.outcome === "ready" && (
        <>
          <ProgramSwitcher
            programs={selection.programs}
            selectedId={selection.selected.academicProgramId}
            basePath={ROUTES.studioRoster}
          />
          <RosterBody academicProgramId={selection.selected.academicProgramId} />
        </>
      )}
    </div>
  );
}

async function RosterBody({ academicProgramId }: { academicProgramId: number }) {
  const result = await loadAttendanceRoster(academicProgramId);

  if (result.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="출석부는 활동의 스터디장만 볼 수 있습니다 — 구글 계정으로 로그인해 주세요"
      />
    );
  }

  if (result.outcome === "signup-required") {
    return <ProgramSignupNotice signupHref={signupUrl()} />;
  }

  if (result.outcome === "error") {
    return <EmptyState title="출석부를 불러오지 못했습니다" description={result.message} />;
  }

  const { members, columns } = result;

  if (columns.length === 0) {
    return (
      <EmptyState
        title="아직 기록된 회차가 없습니다"
        description="스터디장이 회차 기록을 제출하면 그 회차가 출석부에 열로 나타납니다."
      />
    );
  }

  if (members.length === 0) {
    return (
      <EmptyState
        title="아직 확정된 팀원이 없습니다"
        description="모집이 끝나고 학술국장이 팀원을 선발하면 이 표에 행으로 나타납니다."
      />
    );
  }

  return (
    <AttendanceRosterMatrix
      academicProgramId={academicProgramId}
      members={members}
      columns={columns}
    />
  );
}
