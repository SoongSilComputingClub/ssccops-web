"use client";

import type { AcademicProgramMember } from "@/entities/academic-program";
import {
  formatAttendanceRate,
  LOW_ATTENDANCE_RATE,
  type RosterSessionColumn,
} from "@/entities/academic-session";
import {
  useAttendanceRoster,
  type RosterCellState,
  type RosterColumn,
} from "@/features/academic-session/model/use-attendance-roster";
import { formatYmd } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";

/*
 * 출석 행렬 표 (#172) — **클라이언트**.
 *
 * ── 로딩 완료 전에는 마운트하지 않는다 (AGENTS.md · 이슈) ────────
 * 상위(`AttendanceRosterPage`)가 SSR 로더 결과가 `ready`가 될 때까지 이 컴포넌트를 마운트하지
 * 않는다. 넘어온 prop을 그대로 `useAttendanceRoster`의 초깃값으로 넘긴다.
 *
 * ── 집계는 훅이 한다 ────────────────────────────────────────────
 * 행렬·팀원별 출석률·기간 평균은 `useAttendanceRoster`가 만들고, 이 컴포넌트는 그리기만 한다
 * (이슈 — 집계는 훅 하나에만).
 *
 * ── 좁은 화면: 가로 스크롤 (이슈가 "정하고 근거를 남기라"고 한 것) ──
 * `lg` 미만에서 **회원별 카드로 바꾸지 않고 표를 가로로 스크롤**한다. 근거:
 *   1. 이 표의 열은 회차 수만큼 무한정 늘어난다 — `GridTable`의 카드 전환은 열이 고정일 때를
 *      전제한 규칙이라(AGENTS.md) 여기 맞지 않고, 애초에 `GridTable`은 어드민에만 있다.
 *   2. 카드로 접으면 "한 팀원의 회차별 흐름"은 보여도 "한 회차에 누가 빠졌나"를 세로로 훑는
 *      동선이 사라진다 — 이 화면의 존재 이유가 활동 전체를 **가로로** 훑는 것이다(이슈).
 *   3. 팀원 이름(첫 열)과 출석률(끝 열)을 `sticky`로 고정해, 가로로 밀어도 어느 행인지·
 *      결과가 얼마인지 놓치지 않게 한다.
 * 가로 스크롤은 표를 감싼 `overflow-x-auto` 안에서만 일어난다 — 페이지 본문은 가로로 밀리지
 * 않는다.
 *
 * ── 정정 동선 ──────────────────────────────────────────────────
 * 칸(버튼)을 누르면 그 회차만 `PATCH`가 나가고 응답으로 그 열만 갱신된다. 승인된 회차
 * (`column.locked`)는 칸을 비활성화하고 사유를 `title`로 붙인다. 출석부에 줄이 없는 칸
 * (`none`)도 누를 수 없다(명단 변경은 재제출의 몫).
 */

const CELL_STYLE: Record<RosterCellState, string> = {
  present: "bg-accent-soft text-accent",
  absent: "bg-bg text-n500 shadow-[inset_0_0_0_1px_#d1d6db]",
  none: "bg-transparent text-n500",
};

const CELL_MARK: Record<RosterCellState, string> = {
  present: "●",
  absent: "○",
  none: "·",
};

function cellTitle(column: RosterColumn, state: RosterCellState, memberName: string): string {
  const seq = column.session.seqno === null ? "" : `${column.session.seqno}회차 `;
  if (state === "none") {
    return `${memberName} — 이 회차 출석부에 없습니다`;
  }
  if (column.locked) {
    return `${seq}승인 완료 — 출석을 고칠 수 없습니다`;
  }
  const now = state === "present" ? "출석" : "결석";
  const next = state === "present" ? "결석" : "출석";
  return `${memberName} · ${seq}${now} — 누르면 ${next}으로 바꿉니다`;
}

export function AttendanceRosterMatrix({
  academicProgramId,
  members,
  columns: initialColumns,
}: {
  academicProgramId: number;
  members: AcademicProgramMember[];
  columns: RosterSessionColumn[];
}) {
  const { rows, columns, periodAverage, sessionRangeLabel, error, toggleCell, clearError } =
    useAttendanceRoster(academicProgramId, initialColumns, members);

  return (
    <section className="flex flex-col gap-[10px]">
      {/* 상단: 회차 범위 · 기간 평균 */}
      <div className="flex items-center gap-[10px]">
        <span className="text-[15px] font-medium text-ink">회차별 참석 현황</span>
        <span className="flex-1" />
        <span className="text-[13px] text-n500">
          {sessionRangeLabel}
          {sessionRangeLabel && periodAverage !== null && " · "}
          {periodAverage !== null && `평균 ${periodAverage}%`}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-[8px] rounded-[12px] bg-amber-soft px-[12px] py-[10px] text-[13.5px] leading-[1.6] text-amber"
        >
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="flex-none text-[13px] underline underline-offset-2"
          >
            닫기
          </button>
        </div>
      )}

      {/* 표: 가로 스크롤 컨테이너 안에서만 밀린다 */}
      <div className="overflow-x-auto rounded-2xl bg-surface shadow-[0_0_0_1px_#e5e8eb]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-n500">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-surface px-[12px] py-[10px] text-left text-[12.5px] font-semibold"
              >
                팀원
              </th>
              {columns.map((column) => (
                <th
                  key={column.session.sessionId}
                  scope="col"
                  className="min-w-[44px] px-[6px] py-[10px] text-center align-bottom font-medium"
                  title={
                    column.session.actualYmd
                      ? `진행일 ${formatYmd(column.session.actualYmd)}`
                      : column.session.planYmd
                        ? `계획일 ${formatYmd(column.session.planYmd)}`
                        : undefined
                  }
                >
                  <span className="block">{column.session.seqno ?? "-"}</span>
                  {column.locked && (
                    <span className="mt-[2px] block text-[10px] text-n500" aria-hidden>
                      승인
                    </span>
                  )}
                </th>
              ))}
              <th
                scope="col"
                className="sticky right-0 z-10 bg-surface px-[12px] py-[10px] text-right text-[12.5px] font-semibold"
              >
                출석률
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.member.eventPtcpId} className="border-t border-line">
                <th
                  scope="row"
                  className="sticky left-0 z-10 whitespace-nowrap bg-surface px-[12px] py-[9px] text-left text-[14px] font-medium text-ink"
                >
                  {row.member.memberName || "-"}
                  {row.member.isLeader && (
                    <span className="ml-[6px] text-[12px] font-normal text-n500">스터디장</span>
                  )}
                </th>

                {columns.map((column) => {
                  const state: RosterCellState =
                    column.cellByMember.get(row.member.eventPtcpId) ?? "none";
                  const interactive = state !== "none" && !column.locked;
                  const name = row.member.memberName || "팀원";
                  return (
                    <td key={column.session.sessionId} className="px-[4px] py-[5px] text-center">
                      <button
                        type="button"
                        onClick={() =>
                          toggleCell(column.session.sessionId, row.member.eventPtcpId)
                        }
                        disabled={!interactive || column.saving}
                        aria-label={cellTitle(column, state, name)}
                        title={cellTitle(column, state, name)}
                        className={cn(
                          "inline-flex h-[26px] w-[30px] items-center justify-center rounded-[7px] text-[12px] transition-colors",
                          CELL_STYLE[state],
                          interactive
                            ? "cursor-pointer hover:brightness-95"
                            : "cursor-not-allowed",
                          column.saving && "opacity-50",
                        )}
                      >
                        {CELL_MARK[state]}
                      </button>
                    </td>
                  );
                })}

                <td
                  className={cn(
                    "sticky right-0 z-10 bg-surface px-[12px] py-[9px] text-right text-[14px]",
                    row.low ? "font-semibold text-danger" : "text-n300",
                  )}
                  title={
                    row.countedSessions === 0
                      ? "출석부에 이 팀원이 있는 회차가 없습니다"
                      : `${row.presentCount} / ${row.countedSessions}회차 출석`
                  }
                >
                  {formatAttendanceRate(row.rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12.5px] leading-[1.6] text-n500">
        <span className="text-accent">●</span> 출석 · <span>○</span> 결석 ·{" "}
        <span>·</span> 이 회차 출석부에 없음. 출석률이 {LOW_ATTENDANCE_RATE}% 미만이면 빨간색으로
        표시됩니다. 회차별 합계(&ldquo;평균&rdquo;)는 회차 기록에 담긴 출석 수를 그대로 씁니다.
      </p>
    </section>
  );
}
