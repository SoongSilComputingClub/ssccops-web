import {
  BackToProgramsNotice,
  NoProgramNotice,
  ProgramSignupNotice,
  selectProgram,
} from "@/features/academic-program";
import { ProgramSwitcher } from "@/features/academic-program/ui/program-switcher";
import { LoginGate } from "@/features/auth";
import { ROUTES, signupUrl } from "@/shared/config/routes";
import { MyProgramDetailPage } from "@/views/my-program-detail";

/*
 * 내 활동 (`/studio/programs` · #188 · #192 · SSR).
 *
 * ── 무엇을 하는 화면인가 ────────────────────────────────────
 * 스터디장/팀장이 자기가 맡은 활동의 커리큘럼 대비 진행·회차 이력·출석 요약을 본다. #188에서는
 * 활동 카드 목록 → 카드 클릭 → 상세였지만, #192에서 **상단 활동 선택 드롭다운 + 하단 상세**로
 * 바꿨다 — 스터디장은 대개 한둘을 오가므로 화면 이동 없이 드롭다운으로 바꾸는 편이 낫다.
 * 첫 진입은 목록 맨 위 활동이 디폴트.
 *
 * `/studio/programs/{id}`(직접 링크 · 대시보드가 건다)는 그대로 두되, 이 화면(`/studio/programs`)이
 * 드롭다운 셸이고 상세 본문은 `MyProgramDetailPage`를 `embedded`로 재사용한다(그쪽의
 * "← 내 활동" 링크만 숨긴다 — 드롭다운이 이미 그 자리다).
 *
 * ── 왜 SSR인가 ────────────────────────────────────────────
 * 이 앱은 조회 화면을 서버 컴포넌트로 그린다(AGENTS.md). 드롭다운(`ProgramSwitcher`)만
 * 클라이언트이고 값이 바뀌면 `?programId=`를 갈아 끼워 서버가 하단을 다시 그린다.
 */

export async function MyProgramsPage({
  academicProgramId,
}: {
  /** 주소의 ?programId= 값. 숫자가 아니거나 없으면 null → 목록 맨 위 */
  academicProgramId: number | null;
}) {
  const selection = await selectProgram(academicProgramId);

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">
          내 활동
        </h1>
        <p className="text-[13.5px] text-n500">
          내가 스터디장·팀장으로 맡고 있는 스터디·프로젝트입니다
        </p>
      </header>

      {selection.outcome === "unauthenticated" && (
        <LoginGate
          title="로그인이 필요합니다"
          description="내 활동은 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해 주세요"
        />
      )}
      {selection.outcome === "signup-required" && (
        <ProgramSignupNotice signupHref={signupUrl()} />
      )}
      {selection.outcome === "none" && <NoProgramNotice />}
      {selection.outcome === "error" && (
        <BackToProgramsNotice
          title="내 활동을 불러오지 못했습니다"
          description={selection.message}
        />
      )}
      {selection.outcome === "ready" && (
        <>
          <ProgramSwitcher
            programs={selection.programs}
            selectedId={selection.selected.academicProgramId}
            basePath={ROUTES.studioPrograms}
          />
          <MyProgramDetailPage
            academicProgramId={selection.selected.academicProgramId}
            embedded
          />
        </>
      )}
    </div>
  );
}
