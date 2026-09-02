import Link from "next/link";
import {
  BackToProgramsNotice,
  NoProgramNotice,
  ProgramSignupNotice,
  selectProgram,
} from "@/features/academic-program";
import { ProgramSwitcher } from "@/features/academic-program/ui/program-switcher";
import { loadRecordTargets, loadSessionRecord } from "@/features/academic-session";
import { sesnSttsBadge } from "@/entities/academic-session";
import { LoginGate } from "@/features/auth";
import { ROUTES, signupUrl, studioRecordUrl } from "@/shared/config/routes";
import { Badge, EmptyState } from "@/shared/ui";
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
 * ── 대상을 어떻게 받는가 (#192) ─────────────────────────────
 * 두 단계다: 상단 활동 선택 드롭다운(`ProgramSwitcher`)으로 활동을, 그 아래 커리큘럼 목록에서
 * 회차를 고른다.
 *   - `?programId=`가 없으면 목록 맨 위 활동이 디폴트. `?curriculumItemId=`가 없으면 커리큘럼
 *     선택 목록을 그린다.
 *   - 내 활동 상세·대시보드는 회차별로 그 둘을 다 붙여 이으므로 곧바로 폼이 열린다.
 *   - 활동 드롭다운으로 활동을 바꾸면 `?curriculumItemId=`는 떨어진다(다른 활동의 회차다).
 */

export async function SessionRecordPage({
  academicProgramId,
  curriculumItemId,
}: {
  academicProgramId: number | null;
  curriculumItemId: number | null;
}) {
  const selection = await selectProgram(academicProgramId);

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">회차 기록</h1>
        <p className="text-[13.5px] text-n500">
          진행한 회차의 내용과 출석을 기록합니다 — 제출하면 학술국장 승인 대기 상태가 됩니다
        </p>
      </header>

      {selection.outcome === "unauthenticated" && (
        <LoginGate
          title="로그인이 필요합니다"
          description="회차 기록은 활동의 스터디장만 작성할 수 있습니다 — 구글 계정으로 로그인해 주세요"
        />
      )}
      {selection.outcome === "signup-required" && (
        <ProgramSignupNotice signupHref={signupUrl()} />
      )}
      {selection.outcome === "none" && <NoProgramNotice />}
      {selection.outcome === "error" && (
        <BackToProgramsNotice
          title="회차 기록을 열지 못했습니다"
          description={selection.message}
        />
      )}
      {selection.outcome === "ready" && (
        <>
          <ProgramSwitcher
            programs={selection.programs}
            selectedId={selection.selected.academicProgramId}
            basePath={ROUTES.studioRecord}
          />
          {curriculumItemId !== null &&
          selection.selected.academicProgramId === academicProgramId ? (
            <RecordBody
              academicProgramId={selection.selected.academicProgramId}
              curriculumItemId={curriculumItemId}
            />
          ) : (
            <CurriculumPicker
              academicProgramId={selection.selected.academicProgramId}
            />
          )}
        </>
      )}
    </div>
  );
}

/*
 * 활동은 정해졌고 어느 회차인지만 남았다. 그 활동의 커리큘럼 항목을 회차 순으로 그려 하나를
 * 고르게 한다 — 지금 기록할 수 있는(isEditable) 항목을 위에 세운다.
 */
async function CurriculumPicker({
  academicProgramId,
}: {
  academicProgramId: number;
}) {
  const result = await loadRecordTargets(academicProgramId);

  if (result.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="회차 기록은 활동의 스터디장만 작성할 수 있습니다 — 구글 계정으로 로그인해 주세요"
      />
    );
  }
  if (result.outcome === "signup-required") {
    return <ProgramSignupNotice signupHref={signupUrl()} />;
  }
  if (result.outcome === "error") {
    return (
      <EmptyState title="커리큘럼을 불러오지 못했습니다" description={result.message} />
    );
  }
  if (result.items.length === 0) {
    return (
      <EmptyState
        title="등록된 커리큘럼이 없습니다"
        description="기획안이 승인되면 커리큘럼이 함께 만들어집니다."
      />
    );
  }

  // 지금 쓸 수 있는 항목을 위로 — 나머지는 회차 순서 그대로
  const editable = result.items.filter((item) => item.isEditable);
  const rest = result.items.filter((item) => !item.isEditable);
  const ordered = [...editable, ...rest];

  return (
    <div className="flex flex-col gap-[12px]">
      <p className="text-[14px] text-n400">어느 회차를 기록할지 고르세요.</p>
      <div className="flex flex-col gap-[8px]">
        {ordered.map((item) => {
          const badge = sesnSttsBadge(item.sesnSttsCd);
          const inner = (
            <>
              <span className="w-[56px] flex-none text-[13px] text-n500">
                {item.seqno != null ? `${item.seqno}회차` : "·"}
              </span>
              <Badge tone={badge.tone}>{badge.label}</Badge>
              <span className="min-w-0 flex-1 text-[14.5px]">
                {item.title || "커리큘럼 항목"}
              </span>
              {item.isEditable ? (
                <span className="flex-none text-[13px] text-accent">기록 →</span>
              ) : (
                <span className="flex-none text-[13px] text-n500">잠김</span>
              )}
            </>
          );
          return item.isEditable ? (
            <Link
              key={item.curriculumItemId}
              href={studioRecordUrl(academicProgramId, item.curriculumItemId)}
              className="flex items-center gap-[10px] rounded-2xl bg-surface p-[14px] shadow-[0_0_0_1px_#e5e8eb] transition-shadow hover:shadow-[0_0_0_1px_#3182f6]"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={item.curriculumItemId}
              className="flex items-center gap-[10px] rounded-2xl bg-surface p-[14px] opacity-60 shadow-[0_0_0_1px_#e5e8eb]"
              title="제출·승인된 회차는 이 화면에서 다시 쓸 수 없습니다"
            >
              {inner}
            </div>
          );
        })}
      </div>
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
    return <ProgramSignupNotice signupHref={signupUrl()} />;
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
