import {
  BackToProgramsNotice,
  NoProgramNotice,
  ProgramChooser,
  ProgramSignupNotice,
  resolveProgram,
} from "@/features/academic-program";
import { loadAttendanceRoster } from "@/features/academic-session";
import { LoginGate } from "@/features/auth";
import { signupUrl, studioRosterUrl } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui";
import { AttendanceRosterMatrix } from "./attendance-roster-matrix";

/*
 * 출석부 — 회차별 참석 현황 행렬 (#172 · ssccops-server#135·#137).
 *
 * ── 무엇을 하는 화면인가 ────────────────────────────────────────
 * 스터디장이 자기 활동의 **행이 팀원, 열이 회차**인 출석 행렬을 한 표로 본다. 오른쪽 끝에
 * 팀원별 출석률, 상단에 기간 평균이 붙는다. 칸을 눌러 출석을 정정할 수 있다(APPROVED 회차는
 * 잠긴다).
 *
 * **회차 기록 작성(#128)과 다른 화면이다.** 그쪽은 회차 하나를 세로로 작성하는 폼이고, 이쪽은
 * 활동 전체를 가로로 훑는 조회·정정 표다. 프로토타입도 메뉴를 따로 둔다.
 *
 * **`+ 출석 입력` 버튼을 만들지 않는다**(이슈 「지킬 것」). 출석은 회차 기록 제출(#128)로 처음
 * 들어오고, 이 화면은 그것을 **고치는** 자리다 — 새로 넣는 경로를 두면 회차 없는 출석이
 * 생긴다(서버도 받지 않는다).
 *
 * ── 왜 SSR 셸 + 클라이언트 표인가 ─────────────────────────────────
 * 이 앱은 조회를 서버 컴포넌트로 그린다(AGENTS.md · #128·#131). "누가 팀원인가·회차가 몇
 * 개인가·각 회차 출석"은 서버에서 모으고(`loadAttendanceRoster`), 칸을 눌러 정정하는
 * 상호작용만 클라이언트다. 로더가 `ready`가 되기 전에는 표를 마운트하지 않는다 — `useState`
 * 초깃값이 곧 표 초깃값이라 동기화 `useEffect`가 필요 없다.
 *
 * ── 활동을 어떻게 고르는가 (#190) ──────────────────────────────
 * 활동 하나(`academicProgramId`)의 출석부다. 내 활동 상세·대시보드가 활동별로 `?programId=`를
 * 붙여 잇는다. 상단 바 메뉴로 값 없이 들어온 경우 `resolveProgram`이 `mine=true` 목록을 본다 —
 * 맡은 활동이 하나면 그 활동으로 바로, 여러 개면 고르게 한다(여러 건일 때 임의 선택 금지).
 */

export async function AttendanceRosterPage({
  academicProgramId,
}: {
  /** 주소의 ?programId= 값. 숫자가 아니거나 없으면 null */
  academicProgramId: number | null;
}) {
  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">출석부</h1>
        <p className="text-[13.5px] text-n500">
          회차별 참석 현황입니다 — 칸을 눌러 출석을 고칠 수 있습니다. 승인된 회차는 잠깁니다
        </p>
      </header>

      {academicProgramId === null ? (
        <UnresolvedBody />
      ) : (
        <RosterBody academicProgramId={academicProgramId} />
      )}
    </div>
  );
}

/*
 * 주소에 `?programId=`가 없이 들어왔다 — 상단 바 메뉴로 온 경우다. 맡은 활동이 하나면 그
 * 활동으로 바로 출석부를 그리고, 여러 개면 고르게 한다(#190 · `resolveProgram`).
 */
async function UnresolvedBody() {
  const resolution = await resolveProgram();

  if (resolution.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="출석부는 활동의 스터디장만 볼 수 있습니다 — 구글 계정으로 로그인해 주세요"
      />
    );
  }
  if (resolution.outcome === "signup-required") {
    return <ProgramSignupNotice signupHref={signupUrl()} />;
  }
  if (resolution.outcome === "none") return <NoProgramNotice />;
  if (resolution.outcome === "error") {
    return (
      <BackToProgramsNotice
        title="어느 활동의 출석부를 볼지 정해야 합니다"
        description={resolution.message}
      />
    );
  }
  if (resolution.outcome === "choose") {
    return (
      <ProgramChooser
        programs={resolution.programs}
        hrefFor={studioRosterUrl}
        prompt="어느 활동의 출석부를 볼지 고르세요."
      />
    );
  }
  return <RosterBody academicProgramId={resolution.program.academicProgramId} />;
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
