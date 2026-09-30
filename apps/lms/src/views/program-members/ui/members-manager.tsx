"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@ssccops/ui";
import type { AcademicProgramMember, PtcpSttsCd } from "@/entities/academic-program";
import { useTeamMemberActions } from "@/features/academic-program/model/use-team-member-actions";
import { EmptyState, Sheet } from "@/shared/ui";
import { AddMemberSheet } from "./add-member-sheet";
import { MemberHistorySection } from "./member-history-section";
import { MemberCardMobile, MemberRowDesktop } from "./member-row";

/*
 * 팀원 명단 + 추가·제외 (#742 · ssccops#553 · server#612).
 *
 * 명단은 서버 렌더가 준 값을 그대로 그린다(`members` — 확정·대기·제외 전부). 누르면 브라우저가
 * 요청하고 `router.refresh()`로 서버 렌더를 다시 받는다(`useTeamMemberActions`) — 명단을 이 컴포넌트가
 * 따로 들고 있지 않아 새로고침된 값과 갈릴 일이 없다.
 *
 * ── 무엇을 누를 수 있나 ──────────────────────────────────────
 * 버튼은 `editable`(서버 `isEditable` — 스터디장·학술국장 × 진행 중)일 때만 선다. 종료·폐지·모집 전에는
 * 감추고 위의 안내 띠가 이유를 말한다. 줄마다 갈 수 있는 길은 서버 전이표의 넷뿐이다:
 *   확정 → «대기로» · «제외»      대기 → «확정»      제외 → «다시 넣기»(재합류)
 * **대기에서 곧바로 제외하는 길은 없다**(서버 400) — 대기자는 참가자였던 적이 없어서다.
 *
 * ── 제외는 확인을 받고, 나머지는 바로 ─────────────────────────
 * 제외는 다음 회차 출석 명단에서 빠지는 일이라 확인 시트가 무엇이 남고 무엇이 빠지는지 적는다.
 * 확정·대기 오가기와 다시 넣기는 되돌리기가 한 번 누르기라 바로 보낸다. 사유는 받지 않는다 —
 * 개인 사정을 시스템에 남길 이유가 없고 이력은 누가·언제·무엇만 남긴다(#742 「택하지 않은 길」).
 *
 * ── 제외된 사람은 접힌 절로 ──────────────────────────────────
 * 기본 명단은 확정·대기다. 제외된 사람은 행이 남으므로(지난 출석이 가리킨다) 절을 따로 두고 접어
 * 둔다 — 섞어 두면 «지금 팀원이 누구인가»가 흐려진다. 거기서 다시 넣는다.
 */

/** 한 줄의 결과 문구 — 성공은 조용한 띠, 실패는 빨간 띠 */
interface Feedback {
  tone: "ok" | "error";
  text: string;
}

function nameOf(member: AcademicProgramMember): string {
  return member.memberName || "팀원";
}

function ActionButton({
  onClick,
  disabled,
  danger,
  children,
}: Readonly<{
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-[28px] rounded-[10px] border border-line px-[10px] py-[4px] text-[13px] text-n400 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "hover:border-danger hover:text-danger" : "hover:border-accent hover:text-accent",
      )}
    >
      {children}
    </button>
  );
}

function MemberTable({
  members,
  actionsOf,
}: Readonly<{
  members: AcademicProgramMember[];
  /** 넘기지 않으면 동작 칸이 없다 */
  actionsOf?: (member: AcademicProgramMember) => ReactNode;
}>) {
  return (
    <>
      {/* 데스크톱: 표 */}
      <table className="hidden w-full border-collapse lg:table">
        <thead>
          <tr className="text-left text-[12.5px] font-semibold uppercase tracking-[.4px] text-n500">
            <th className="px-[12px] pb-[10px] pt-[8px]">이름</th>
            <th className="px-[12px] pb-[10px] pt-[8px]">역할</th>
            <th className="px-[12px] pb-[10px] pt-[8px]">합류일</th>
            <th className="px-[12px] pb-[10px] pt-[8px]">상태</th>
            {actionsOf && (
              <th className="px-[12px] pb-[10px] pt-[8px]">
                <span className="sr-only">동작</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <MemberRowDesktop
              key={member.eventPtcpId}
              member={member}
              actions={actionsOf ? actionsOf(member) : undefined}
            />
          ))}
        </tbody>
      </table>

      {/* 모바일: 카드 */}
      <div className="flex flex-col px-[8px] py-[4px] lg:hidden">
        {members.map((member) => (
          <MemberCardMobile
            key={member.eventPtcpId}
            member={member}
            actions={actionsOf ? actionsOf(member) : undefined}
          />
        ))}
      </div>
    </>
  );
}

export function MembersManager({
  academicProgramId,
  members,
  editable,
}: Readonly<{
  academicProgramId: number;
  /** 서버 렌더가 준 명단 전부(확정·대기·제외) */
  members: AcademicProgramMember[];
  /** 이 명단을 고칠 수 있는가 — 서버 `isEditable`(명단이 비었을 때만 페이지가 대신 정한다) */
  editable: boolean;
}>) {
  const actions = useTeamMemberActions(academicProgramId);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  /** 추가 시트 — 열 때마다 새 값이라 회원 목록을 다시 받는다. 닫혀 있으면 null */
  const [addOpenKey, setAddOpenKey] = useState<number | null>(null);
  /** 제외 확인 시트의 대상 */
  const [excluding, setExcluding] = useState<AcademicProgramMember | null>(null);
  const [excludedOpen, setExcludedOpen] = useState(false);
  const excludedId = useId();

  const active = members.filter((m) => m.ptcpSttsCd !== "CANCELLED");
  const excluded = members.filter((m) => m.ptcpSttsCd === "CANCELLED");

  const changeStatus = async (
    member: AcademicProgramMember,
    next: PtcpSttsCd,
    done: string,
  ): Promise<boolean> => {
    setFeedback(null);
    const message = await actions.run({
      kind: "status",
      eventPtcpId: member.eventPtcpId,
      next,
    });
    setFeedback(message ? { tone: "error", text: message } : { tone: "ok", text: done });
    return !message;
  };

  const addMember = async (memberId: number, name: string): Promise<boolean> => {
    setFeedback(null);
    const message = await actions.run({ kind: "add", memberId });
    setFeedback(
      message
        ? { tone: "error", text: message }
        : { tone: "ok", text: `${name || "회원"}님을 팀원으로 넣었습니다.` },
    );
    return !message;
  };

  const confirmExclude = async () => {
    if (!excluding) return;
    const target = excluding;
    await changeStatus(target, "CANCELLED", `${nameOf(target)}님을 제외했습니다.`);
    setExcluding(null);
  };

  const activeActions = (member: AcademicProgramMember): ReactNode => {
    if (member.ptcpSttsCd === "WAITLISTED") {
      return (
        <ActionButton
          disabled={actions.busy}
          onClick={() =>
            void changeStatus(member, "CONFIRMED", `${nameOf(member)}님을 확정했습니다.`)
          }
        >
          확정
        </ActionButton>
      );
    }
    return (
      <>
        <ActionButton
          disabled={actions.busy}
          onClick={() =>
            void changeStatus(member, "WAITLISTED", `${nameOf(member)}님을 대기로 옮겼습니다.`)
          }
        >
          대기로
        </ActionButton>
        <ActionButton danger disabled={actions.busy} onClick={() => setExcluding(member)}>
          제외
        </ActionButton>
      </>
    );
  };

  const excludedActions = (member: AcademicProgramMember): ReactNode => (
    <ActionButton
      disabled={actions.busy}
      onClick={() => void changeStatus(member, "CONFIRMED", `${nameOf(member)}님을 다시 넣었습니다.`)}
    >
      다시 넣기
    </ActionButton>
  );

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="text-[15px] font-medium text-ink">팀원 {active.length}명</span>
        <span className="flex-1" />
        {editable && (
          <button
            type="button"
            onClick={() => setAddOpenKey(Date.now())}
            disabled={actions.busy}
            className="rounded-[12px] bg-accent px-[14px] py-[8px] text-[14px] font-semibold text-on-solid transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            팀원 추가
          </button>
        )}
      </div>

      {feedback && (
        <p
          role="status"
          className={cn(
            "rounded-[12px] px-[14px] py-[10px] text-[13.5px]",
            feedback.tone === "error" ? "bg-danger/10 text-danger" : "bg-bg text-n400",
          )}
        >
          {feedback.text}
        </p>
      )}

      {active.length === 0 ? (
        <EmptyState
          title="아직 확정된 팀원이 없습니다"
          description={
            editable
              ? "«팀원 추가»로 동아리 회원을 넣을 수 있습니다."
              : "모집이 끝나고 학술국장이 팀원을 선발하면 이 명단에 나타납니다."
          }
        />
      ) : (
        <section className="rounded-2xl bg-surface p-[6px] shadow-[0_0_0_1px_var(--color-line)] lg:p-[10px]">
          <MemberTable members={active} actionsOf={editable ? activeActions : undefined} />
        </section>
      )}

      {excluded.length > 0 && (
        <section className="flex flex-col gap-[8px]">
          <button
            type="button"
            aria-expanded={excludedOpen}
            aria-controls={excludedId}
            onClick={() => setExcludedOpen((v) => !v)}
            className="flex items-center gap-[6px] self-start text-[14px] text-n400 hover:text-ink"
          >
            <span aria-hidden>{excludedOpen ? "▾" : "▸"}</span>
            제외된 팀원 {excluded.length}명
          </button>
          <div
            id={excludedId}
            hidden={!excludedOpen}
            className="rounded-2xl bg-surface p-[6px] shadow-[0_0_0_1px_var(--color-line)] lg:p-[10px]"
          >
            <MemberTable members={excluded} actionsOf={editable ? excludedActions : undefined} />
          </div>
        </section>
      )}

      <MemberHistorySection academicProgramId={academicProgramId} version={actions.version} />

      <AddMemberSheet
        openKey={addOpenKey}
        members={members}
        busy={actions.busy}
        onClose={() => setAddOpenKey(null)}
        onAdd={async (memberId, name) => {
          const ok = await addMember(memberId, name);
          if (ok) setAddOpenKey(null);
        }}
      />

      <Sheet
        open={excluding !== null}
        title="팀원 제외"
        okLabel={actions.busy ? "제외하는 중…" : "제외"}
        okTone="danger"
        okDisabled={actions.busy}
        onClose={() => setExcluding(null)}
        onOk={() => void confirmExclude()}
      >
        <p className="text-[14.5px] leading-[1.7] text-ink">
          {excluding ? nameOf(excluding) : "팀원"}님을 명단에서 뺍니다.
        </p>
        <p className="mt-[6px] text-[13.5px] leading-[1.7] text-n500">
          다음 회차부터 출석 명단에서 빠집니다. 지난 출석 기록은 남고, 이력에 남습니다. 잘못
          뺐다면 제외된 팀원에서 다시 넣을 수 있습니다.
        </p>
      </Sheet>
    </div>
  );
}
