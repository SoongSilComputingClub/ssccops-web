"use client";

import { ptcpSttsBadge } from "@/entities/academic-program/model/display";
import type { AttendanceTarget } from "@/features/academic-session/model/attendance-targets";
import { cn } from "@/shared/lib/cn";
import { Badge, type BadgeTone } from "@/shared/ui";

/*
 * 출석 체크리스트 (#128) — 출석 대상을 줄로 놓고 참석/결석을 토글한다.
 *
 * 대상 식별자는 회원 PK가 아니라 **`eventPtcpId`**다(팀원 목록이 주는 값 · 서버 계약). 상태는
 * 부모(폼)가 `Record<eventPtcpId, boolean>`로 쥐고, 이 컴포넌트는 그리기만 한다 — 제출 본문의
 * `attendances`가 이 맵에서 만들어진다.
 *
 * 줄은 확정 팀원만이 아니다(#748). 재제출이면 그 회차에 기록된 뒤 제외·대기된 사람도 이전 체크
 * 값으로 나오고(«제외»·«대기» 표식), 기록 뒤 합류한 사람은 결석으로 시작한다(«기록 뒤 합류»).
 * 줄을 누가 무엇으로 시작하는지는 로더가 정했다(`attendanceTargetsOf`).
 *
 * 이것은 **작성 화면의 체크박스**이지 출석 정정(`PATCH .../attendances`)이 아니다 — 정정은
 * 이미 제출한 회차의 출석만 고치는 별도 경로다(이슈 「지킬 것」).
 */

/** 줄 옆 표식 — 지금 확정 팀원이고 이 회차에 기록된 사람(가장 흔한 줄)은 표식이 없다 */
function targetTag(target: AttendanceTarget): { label: string; tone: BadgeTone } | null {
  if (target.kind === "joined-after") return { label: "기록 뒤 합류", tone: "blue" };
  if (target.kind === "recorded-only") {
    // 명단에서 찾지 못하면 상태를 지어내지 않는다
    return target.currentSttsCd
      ? ptcpSttsBadge(target.currentSttsCd)
      : { label: "명단에 없음", tone: "grey" };
  }
  return null;
}

export function AttendanceChecklist({
  targets,
  present,
  onToggle,
  disabled,
}: Readonly<{
  targets: AttendanceTarget[];
  /** eventPtcpId → 참석 여부 */
  present: Record<number, boolean>;
  onToggle: (eventPtcpId: number) => void;
  disabled?: boolean;
}>) {
  const presentCount = targets.filter((t) => present[t.eventPtcpId]).length;
  const hasJoinedAfter = targets.some((t) => t.kind === "joined-after");
  const hasRecordedOnly = targets.some((t) => t.kind === "recorded-only");

  if (targets.length === 0) {
    return (
      <p className="rounded-[12px] border border-dashed border-line-strong bg-bg px-[12px] py-[16px] text-[13.5px] text-n500">
        아직 확정된 팀원이 없습니다. 출석 없이 회차 기록만 제출됩니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex items-center gap-[10px]">
        <span className="text-[15px] font-medium text-ink">출석 체크</span>
        <span className="flex-1" />
        <span className="text-[13.5px] text-n500">
          {presentCount} / {targets.length}명
        </span>
      </div>
      <ul className="flex flex-col gap-[8px]">
        {targets.map((target) => {
          const checked = present[target.eventPtcpId] ?? false;
          const tag = targetTag(target);
          return (
            <li key={target.eventPtcpId}>
              <button
                type="button"
                onClick={() => onToggle(target.eventPtcpId)}
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
                    "flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] text-[13px] text-on-solid",
                    checked ? "bg-accent" : "bg-bg shadow-[inset_0_0_0_1px_var(--color-line-strong)]",
                  )}
                >
                  {checked ? "✓" : ""}
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-[6px] gap-y-[2px] text-[15px] text-ink">
                  <span>{target.memberName || "-"}</span>
                  {target.isLeader && <span className="text-[13px] text-n500">스터디장</span>}
                  {tag && <Badge tone={tag.tone}>{tag.label}</Badge>}
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
      {(hasJoinedAfter || hasRecordedOnly) && (
        <div className="flex flex-col gap-[4px] text-[13px] leading-[1.6] text-n500">
          {hasJoinedAfter && <p>이 회차를 기록한 뒤 합류한 사람은 결석으로 시작합니다.</p>}
          {hasRecordedOnly && (
            <p>제외·대기된 사람도 이 회차에 기록돼 있으면 보입니다. 그 출석은 그대로 남습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
