import {
  BackToProgramsNotice,
  loadAcademicProgramMembers,
  NoProgramNotice,
  ProgramSignupNotice,
  selectProgram,
} from "@/features/academic-program";
import { ProgramSwitcher } from "@/features/academic-program/ui/program-switcher";
import { LoginGate } from "@/features/auth";
import { ROUTES, signupUrl } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui";
import { MemberCardMobile, MemberRowDesktop } from "./member-row";

/*
 * 팀원 관리 (#131 · ssccops-server#138 · GET /v1/academic-programs/{id}/members).
 *
 * ── 무엇을 하는 화면인가 ────────────────────────────────────────
 * 스터디장이 자기 활동에 확정·대기 중인 팀원 명단을 보는 **조회 전용** 화면이다. `event_ptcp`를
 * 그대로 프록시한다 — 팀원 추가·제외 버튼이 없다(팀원은 학술국장의 선발 #127로만 확정되고
 * 서버에 추가·제외 API가 없다). 프로토타입 헤더의 `+ 팀원 추가`는 선발 권한이 국장으로
 * 정정되기 전의 시안이다.
 *
 * ── 왜 SSR인가 ────────────────────────────────────────────────
 * 이 앱은 조회 화면을 서버 컴포넌트로 그린다(AGENTS.md · apps/www MyApplicationsPage와 같은
 * 규약). 쿠키의 Supabase 세션을 서버에서 읽어 토큰을 브라우저 코드에 싣지 않고, 읽기 전용
 * 화면에 데이터 페칭 상태 기계를 들이지 않는다. 로그인 상태로 갈리는 부분(`LoginGate`)만
 * 클라이언트다.
 *
 * ── 활동을 어떻게 고르는가 (#192) ──────────────────────────────
 * 상단 활동 선택 드롭다운(`ProgramSwitcher`)으로 고른다. `?programId=`가 있으면 그 활동,
 * 없으면 목록 맨 위 — 드롭다운으로 언제든 바꾼다. SSR 셸이 `mine=true` 목록 전체와 선택
 * 활동을 함께 받는다(`selectProgram`).
 *
 * ── 학번·출석률 열이 없다 (#131 결정) ────────────────────────────
 * 서버 응답에 학번·출석률이 없다. 없는 값을 만들어 내지 않는다 — 필요하면 서버에 필드 추가를
 * 먼저 요청한다. 출석률은 활동 횡단 집계 훅(#130 · `ACADEMIC_PROGRAM_MANAGE`)이 필요한데
 * 스터디장은 그 권한이 없어 이 화면에서 셀 수 없다.
 */

export async function ProgramMembersPage({
  academicProgramId,
}: {
  /** 주소의 ?programId= 값. 숫자가 아니거나 없으면 null → 목록 맨 위 */
  academicProgramId: number | null;
}) {
  const selection = await selectProgram(academicProgramId);

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">팀원 관리</h1>
        <p className="text-[13.5px] text-n500">
          활동에 확정·대기 중인 팀원 명단입니다 — 팀원 선발과 변경은 학술국장이 맡습니다
        </p>
      </header>

      {selection.outcome === "unauthenticated" && (
        <LoginGate
          title="로그인이 필요합니다"
          description="팀원 명단은 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해 주세요"
        />
      )}
      {selection.outcome === "signup-required" && (
        <ProgramSignupNotice signupHref={signupUrl()} />
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
          <MembersBody academicProgramId={selection.selected.academicProgramId} />
        </>
      )}
    </div>
  );
}

async function MembersBody({ academicProgramId }: { academicProgramId: number }) {
  const result = await loadAcademicProgramMembers(academicProgramId);

  if (result.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="팀원 명단은 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해 주세요"
      />
    );
  }

  if (result.outcome === "signup-required") {
    return <ProgramSignupNotice signupHref={signupUrl()} />;
  }

  if (result.outcome === "error") {
    return <EmptyState title="팀원 명단을 불러오지 못했습니다" description={result.message} />;
  }

  const { members } = result;

  if (members.length === 0) {
    return (
      <EmptyState
        title="아직 확정된 팀원이 없습니다"
        description="모집이 끝나고 학술국장이 팀원을 선발하면 이 명단에 나타납니다."
      />
    );
  }

  return (
    <section className="rounded-2xl bg-surface p-[6px] shadow-[0_0_0_1px_#e5e8eb] lg:p-[10px]">
      {/* 데스크톱: 표 */}
      <table className="hidden w-full border-collapse lg:table">
        <thead>
          <tr className="text-left text-[12.5px] font-semibold uppercase tracking-[.4px] text-n500">
            <th className="px-[12px] pb-[10px] pt-[8px]">이름</th>
            <th className="px-[12px] pb-[10px] pt-[8px]">역할</th>
            <th className="px-[12px] pb-[10px] pt-[8px]">합류일</th>
            <th className="px-[12px] pb-[10px] pt-[8px]">상태</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <MemberRowDesktop key={member.eventPtcpId} member={member} />
          ))}
        </tbody>
      </table>

      {/* 모바일: 카드 */}
      <div className="flex flex-col px-[8px] py-[4px] lg:hidden">
        {members.map((member) => (
          <MemberCardMobile key={member.eventPtcpId} member={member} />
        ))}
      </div>
    </section>
  );
}
