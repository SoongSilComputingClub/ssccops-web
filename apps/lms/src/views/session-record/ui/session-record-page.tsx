import Link from "next/link";
import { loadSessionRecord } from "@/features/academic-session";
import { LoginGate } from "@/features/auth";
import { ROUTES, signupUrl } from "@/shared/config/routes";
import { EmptyState, Notice } from "@/shared/ui";
import { SessionRecordForm } from "./session-record-form";

/*
 * 회차 기록 작성 (#128 · ssccops-server#135·#137).
 *
 * ── 무엇을 하는 화면인가 ────────────────────────────────────
 * 스터디장이 회차 종료 후 진행 내용·출석·인증사진을 기록하는 화면이다. 단일 "제출" 버튼이지만
 * 내부적으로는 회차 기록 저장 → 인증사진 R2 업로드 순서로 이어진다(`use-submit-session`).
 *
 * ── 왜 SSR 셸 + 클라이언트 폼인가 ───────────────────────────
 * 이 앱은 조회를 서버 컴포넌트로 그린다(AGENTS.md · #131). "이 회차를 지금 쓸 수 있는가·팀원은
 * 누구인가"는 서버에서 판정하고(`loadSessionRecord`), 답을 고쳐 가며 제출하는 폼 부분만
 * 클라이언트다. 상세 조회가 `ready`가 되기 전에는 `SessionRecordForm`을 마운트하지 않는다 —
 * 그러면 `useState` 초깃값이 곧 폼 초깃값이라 동기화용 `useEffect`가 필요 없다(이슈 · AGENTS.md).
 *
 * ── 대상을 어떻게 받는가 ────────────────────────────────────
 * 활동(`?programId=`)과 커리큘럼 항목(`?curriculumItemId=`)을 주소로 받는다. 하나라도 없으면
 * 대시보드에서 회차를 골라 들어오라고 안내한다 — lms에는 아직 '내 활동' 목록이 없어(후속) 여기서
 * 기본값을 임의로 고르지 않는다("없는 값을 만들어 내지 않는다").
 */

export async function SessionRecordPage({
  academicProgramId,
  curriculumItemId,
}: {
  academicProgramId: number | null;
  curriculumItemId: number | null;
}) {
  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">회차 기록</h1>
        <p className="text-[13.5px] text-n500">
          진행한 회차의 내용과 출석을 기록합니다 — 제출하면 학술국장 승인 대기 상태가 됩니다
        </p>
      </header>

      {academicProgramId === null || curriculumItemId === null ? (
        <Notice
          title="어느 회차를 기록할지 정해야 합니다"
          description="학술 대시보드에서 기록할 회차를 고르면 이 화면이 그 회차로 열립니다."
        >
          <Link
            href={ROUTES.studio}
            className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white hover:bg-accent-strong"
          >
            학술 대시보드로
          </Link>
        </Notice>
      ) : (
        <RecordBody
          academicProgramId={academicProgramId}
          curriculumItemId={curriculumItemId}
        />
      )}
    </div>
  );
}

async function RecordBody({
  academicProgramId,
  curriculumItemId,
}: {
  academicProgramId: number;
  curriculumItemId: number;
}) {
  const result = await loadSessionRecord(academicProgramId, curriculumItemId);

  if (result.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="회차 기록은 활동의 스터디장만 작성할 수 있습니다 — 구글 계정으로 로그인해 주세요"
      />
    );
  }

  if (result.outcome === "signup-required") {
    const signup = signupUrl();
    return (
      <Notice
        title="회원 가입을 마쳐야 회차를 기록할 수 있습니다"
        description="로그인은 되었지만 아직 동아리 회원으로 등록되지 않았습니다."
      >
        {signup && (
          <a
            href={signup}
            className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white hover:bg-accent-strong"
          >
            회원 가입하기
          </a>
        )}
      </Notice>
    );
  }

  if (result.outcome === "not-leader") {
    return (
      <EmptyState
        title="이 회차를 기록할 수 없습니다"
        description="회차 기록은 활동의 스터디장만 작성할 수 있습니다."
      />
    );
  }

  if (result.outcome === "not-recordable") {
    return (
      <EmptyState
        title={`${result.sesnSttsLabel} 회차입니다`}
        description="제출된 회차는 국장 검토가 끝나야, 승인된 회차는 더 이상 수정할 수 없습니다 — 회차 내용은 '내 활동'에서 볼 수 있습니다."
      />
    );
  }

  if (result.outcome === "error") {
    return <EmptyState title="회차 정보를 불러오지 못했습니다" description={result.message} />;
  }

  return (
    <SessionRecordForm
      academicProgramId={academicProgramId}
      mode={result.mode}
      curriculumItem={result.curriculumItem}
      members={result.members}
      session={result.session}
    />
  );
}
