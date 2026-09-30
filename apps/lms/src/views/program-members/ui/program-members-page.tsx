import type { AcdmActvSttsCd } from "@/entities/academic-program";
import {
  BackToProgramsNotice,
  loadAcademicProgramMembers,
  NoProgramNotice,
  ProgramSignupNotice,
  ProgramStoppedNotice,
  selectProgram,
} from "@/features/academic-program";
import { ProgramSwitcher } from "@/features/academic-program/ui/program-switcher";
import { LoginGate } from "@/features/auth";
import { ROUTES } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui";
import { MembersManager } from "./members-manager";

/*
 * 팀원 관리 (#131 · ssccops-server#138 · 추가·제외 #742 · server#612).
 *
 * ── 무엇을 하는 화면인가 ────────────────────────────────────────
 * 스터디장이 자기 활동의 팀원 명단을 보고 **직접 고치는** 화면이다(#742 · ssccops#553 — 모집 뒤
 * 개인 사정으로 빠지는 팀원을 스터디장이 정리하게 해 달라는 피드백). 동아리 회원 누구나 신청서
 * 없이 넣을 수 있고, 빼는 것은 참가 취소(지난 출석은 남는다)이며, 잘못 뺀 사람은 다시 넣는다.
 * **학술국장 승인이 없다** — 그 대신 명단 변경 이력이 이 화면에 보인다(ADR-0042). 처음(#131)에는
 * 서버에 추가·제외 API가 없어 조회 전용이었고 팀원은 학술국장의 선발(#127)로만 들어왔다.
 *
 * ── 왜 SSR 셸 + 클라이언트 명단인가 ─────────────────────────────
 * 명단 조회는 이 앱의 규약대로 서버 컴포넌트가 한다(쿠키의 세션을 서버에서 읽어 토큰을 브라우저
 * 코드에 싣지 않는다). 누르는 부분(추가·제외·이력 펼치기)만 클라이언트이고, 바꾼 뒤에는
 * `router.refresh()`로 이 서버 렌더를 다시 받는다(`MembersManager`).
 *
 * ── 버튼은 서버 `isEditable`을 따른다 ──────────────────────────
 * 명단 응답이 줄마다 «요청자가 이 명단을 고칠 수 있는가»를 싣는다(스터디장·학술국장 × 진행 중).
 * 종료·폐지·모집 전에는 버튼이 없고, 종료·폐지면 안내 띠가 이유를 말한다. **명단이 비었을 때만**
 * 그 값을 받을 줄이 없어 셸이 이미 받은 프로그램 상태(진행 중)로 대신 정한다 — `mine=leader`
 * 목록의 프로그램이라 요청자는 스터디장이다. 빈 명단에 버튼이 없으면 첫 팀원을 넣을 길이 없다.
 *
 * ── 활동을 어떻게 고르는가 (#192) ──────────────────────────────
 * 상단 활동 선택 드롭다운(`ProgramSwitcher`)으로 고른다. `?programId=`가 있으면 그 활동,
 * 없으면 목록 맨 위 — 드롭다운으로 언제든 바꾼다. SSR 셸이 `mine=leader` 목록 전체와 선택
 * 활동을 함께 받는다(`selectProgram`).
 *
 * ── 학번·출석률 열이 없다 (#131 결정) ────────────────────────────
 * 서버 응답에 학번·출석률이 없다. 없는 값을 만들어 내지 않는다 — 필요하면 서버에 필드 추가를
 * 먼저 요청한다. 출석률은 활동 횡단 집계 훅(#130 · `ACADEMIC_PROGRAM_MANAGE`)이 필요한데
 * 스터디장은 그 권한이 없어 이 화면에서 셀 수 없다.
 */

export async function ProgramMembersPage({
  academicProgramId,
}: Readonly<{
  /** 주소의 ?programId= 값. 숫자가 아니거나 없으면 null → 목록 맨 위 */
  academicProgramId: number | null;
}>) {
  const selection = await selectProgram(academicProgramId);

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">팀원 관리</h1>
        <p className="text-[13.5px] text-n500">
          확정·대기 중인 팀원 명단입니다. 넣고 뺀 기록은 이력에 남습니다.
        </p>
      </header>

      {selection.outcome === "unauthenticated" && (
        <LoginGate
          title="로그인이 필요합니다"
          description="팀원 명단은 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해주세요"
        />
      )}
      {selection.outcome === "signup-required" && (
        <ProgramSignupNotice />
      )}
      {selection.outcome === "none" && <NoProgramNotice />}
      {selection.outcome === "error" && (
        <BackToProgramsNotice
          title="팀원 명단을 불러오지 못했습니다"
          description={selection.message}
        />
      )}
      {selection.outcome === "ready" && (
        <>
          <ProgramSwitcher
            programs={selection.programs}
            selectedId={selection.selected.academicProgramId}
            basePath={ROUTES.studioMembers}
          />
          <ProgramStoppedNotice sttsCd={selection.selected.sttsCd} />
          <MembersBody
            academicProgramId={selection.selected.academicProgramId}
            programSttsCd={selection.selected.sttsCd}
          />
        </>
      )}
    </div>
  );
}

async function MembersBody({
  academicProgramId,
  programSttsCd,
}: Readonly<{
  academicProgramId: number;
  /** 셸이 고른 프로그램의 상태 — 명단이 비어 `isEditable`을 받을 줄이 없을 때만 쓴다 */
  programSttsCd: AcdmActvSttsCd;
}>) {
  // 상태로 거르지 않고 전부 받는다 — 확정·대기는 명단, 제외(취소)는 접힌 절로 화면이 가른다
  const result = await loadAcademicProgramMembers(academicProgramId);

  if (result.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="팀원 명단은 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해주세요"
      />
    );
  }

  if (result.outcome === "signup-required") {
    return <ProgramSignupNotice />;
  }

  if (result.outcome === "error") {
    return <EmptyState title="팀원 명단을 불러오지 못했습니다" description={result.message} />;
  }

  const { members } = result;
  const editable = members.length > 0 ? members[0].isEditable : programSttsCd === "ONGOING";

  return (
    <MembersManager academicProgramId={academicProgramId} members={members} editable={editable} />
  );
}
