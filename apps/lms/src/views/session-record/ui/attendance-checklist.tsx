"use client";

import type { AcademicProgramMember } from "@/entities/academic-program";
import { cn } from "@/shared/lib/cn";

/*
 * 출석 체크리스트 (#128) — 확정 팀원 전원을 줄로 놓고 참석/결석을 토글한다.
 *
 * 대상 식별자는 회원 PK가 아니라 **`eventPtcpId`**다(팀원 목록이 주는 값 · 서버 계약). 상태는
 * 부모(폼)가 `Record<eventPtcpId, boolean>`로 쥐고, 이 컴포넌트는 그리기만 한다 — 제출 본문의
 * `attendances`가 이 맵에서 만들어진다.
 *
 * 이것은 **작성 화면의 체크박스**이지 출석 정정(`PATCH .../attendances`)이 아니다 — 정정은
 * 이미 제출한 회차의 출석만 고치는 별도 경로다(이슈 「지킬 것」).
 */

export function AttendanceChecklist({
  members,
  present,
  onToggle,
  disabled,
}: {
  members: AcademicProgramMember[];
  /** eventPtcpId → 참석 여부 */
  present: Record<number, boolean>;
  onToggle: (eventPtcpId: number) => void;
  disabled?: boolean;
}) {
  const presentCount = members.filter((m) => present[m.eventPtcpId]).length;

  if (members.length === 0) {
    return (
      <p className="rounded-[12px] border border-dashed border-line-strong bg-bg px-[12px] py-[16px] text-[13.5px] text-n500">
        아직 확정된 팀원이 없습니다 — 출석 없이 회차 기록만 제출할 수 있습니다
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex items-center gap-[10px]">
        <span className="text-[15px] font-medium text-ink">출석 체크</span>
        <span className="flex-1" />
        <span className="text-[13.5px] text-n500">
          {presentCount} / {members.length}명
        </span>
      </div>
      <ul className="flex flex-col gap-[8px]">
        {members.map((member) => {
          const checked = present[member.eventPtcpId] ?? false;
          return (
            <li key={member.eventPtcpId}>
              <button
                type="button"
                onClick={() => onToggle(member.eventPtcpId)}
                disabled={disabled}
                aria-pressed={checked}
                className={cn(
                  "flex w-full items-center gap-[10px] rounded-[12px] border px-[12px] py-[10px] text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  checked
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] text-[13px] text-white",
                    checked ? "bg-accent" : "bg-bg shadow-[inset_0_0_0_1px_#d1d6db]",
                  )}
                >
                  {checked ? "✓" : ""}
                </span>
                <span className="flex-1 text-[15px] text-ink">
                  {member.memberName || "-"}
                  {member.isLeader && (
                    <span className="ml-[6px] text-[13px] text-n500">스터디장</span>
                  )}
                </span>
                {!checked && (
                  <span className="flex-none rounded-[6px] bg-bg px-[7px] py-[2px] text-[13px] text-n300">
                    결석
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
