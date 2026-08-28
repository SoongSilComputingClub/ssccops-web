"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { AcademicProgramMember } from "@/entities/academic-program";
import {
  attendanceRatePercent,
  correctSessionAttendances,
  isLowAttendanceRate,
  type AcademicSessionSummary,
  type RosterSessionColumn,
} from "@/entities/academic-session";
import { correctAttendanceErrorMessage } from "./attendance-roster-error";

/*
 * 출석부 행렬 조립 + 집계 + 정정 (#172).
 *
 * ── 이 훅이 유일한 집계 자리다 (이슈) ────────────────────────────
 * 회차×팀원 행렬, 팀원별 출석률, 기간 평균을 **여기서만** 센다. 화면(뷰)은 이 훅이 만든 값을
 * 그리기만 한다 — 출석률 계산이 여러 곳에 흩어지면 규칙이 두 벌이 된다(#130의 출석 통계 훅과
 * 같은 원칙).
 *
 * ── 칸 하나 = (팀원, 회차) ────────────────────────────────────
 * `present`: 그 회차 출석부에 이 팀원 줄이 있고 출석 = true
 * `absent` : 그 회차 출석부에 이 팀원 줄이 있고 결석 = false
 * `none`   : 그 회차 출석부에 이 팀원 줄이 없다(그때는 팀원이 아니었다 등) — 셈에서 제외한다
 *
 * ── 회차별 합계는 서버 값을 쓴다 (이슈) ────────────────────────────
 * 열(회차)의 "N/M명"은 `SessionSummary.presentCount`·`totalCount`를 그대로 쓴다 — 출석부 줄을
 * 다시 세지 않는다. 정정 응답도 다시 센 집계를 함께 주므로(`correctSessionAttendances`) 그
 * 값으로 갈아 끼운다.
 *
 * ── 팀원별 출석률·기간 평균은 여기서 센다 ──────────────────────────
 * 서버가 주는 것은 회차별 합계뿐이다. 팀원별(행) 출석률과 기간 평균은 행렬에서 파생한다:
 *   - 팀원별  = 그 팀원이 줄을 가진 회차 중 출석한 비율
 *   - 기간 평균 = 모든 회차 `presentCount` 합 / `totalCount` 합 (서버 합계만으로 구한다)
 *
 * ── 정정: 해당 회차만 부분 갱신 (이슈 · AGENTS.md) ────────────────────
 * 칸을 누르면 그 회차에 대해 `PATCH .../attendances`를 보내고, 응답의 갱신된 명단 + 다시 센
 * 집계로 **그 회차 열 하나만** 갈아 끼운다. 전체 재조회는 하지 않는다. 실패하면 누르기 전
 * 값으로 되돌린다.
 *
 * ── 승인된 회차는 잠근다 (이슈 · 서버 `SessionStatus.allowsCorrection()`) ──
 * `APPROVED`가 아니면 정정할 수 있다. 화면은 `column.locked`로 칸을 비활성화하고 사유를
 * `title`로 붙인다.
 *
 * ── 연타/경합 ────────────────────────────────────────────────
 * 같은 회차에 정정이 진행 중이면 그 회차의 다음 클릭을 막는다(`pendingRef`). 회차가 다르면
 * 동시에 진행해도 무방하다(서로 다른 열이라 갱신이 겹치지 않는다).
 */

/** 칸 하나의 상태 */
export type RosterCellState = "present" | "absent" | "none";

/** 표의 한 열(회차) — 화면이 그릴 값으로 가공한 것 */
export interface RosterColumn {
  session: AcademicSessionSummary;
  /** 정정할 수 없는 회차인가(APPROVED) */
  locked: boolean;
  /** 이 회차에 정정 요청이 진행 중인가 */
  saving: boolean;
  /** eventPtcpId → 이 회차에서의 출석 상태 */
  cellByMember: Map<number, RosterCellState>;
}

/** 표의 한 행(팀원) 요약 */
export interface RosterRow {
  member: AcademicProgramMember;
  /** 이 팀원이 줄을 가진 회차 수 */
  countedSessions: number;
  presentCount: number;
  /** 출석률(%). 셀 회차가 없으면 null */
  rate: number | null;
  /** 살펴봐야 하는 낮은 출석률인가 */
  low: boolean;
}

export interface AttendanceRosterView {
  rows: RosterRow[];
  columns: RosterColumn[];
  /** 기간 평균 출석률(%). 셀 회차가 없으면 null */
  periodAverage: number | null;
  /** 회차 순번 범위 라벨 — "1 ~ 8회차" / 회차가 없으면 "" */
  sessionRangeLabel: string;
  /** 정정 실패 문구(있으면). 다음 클릭 때 지운다 */
  error: string | null;
  /** 칸 클릭 — 출석/결석을 뒤집는다. locked 회차·none 칸에는 무시된다 */
  toggleCell: (sessionId: number, eventPtcpId: number) => void;
  clearError: () => void;
}

/** 회차 출석부 줄들 → eventPtcpId별 상태 맵 */
function toCellMap(column: RosterSessionColumn): Map<number, RosterCellState> {
  const map = new Map<number, RosterCellState>();
  for (const row of column.attendances) {
    map.set(row.eventPtcpId, row.atndYn ? "present" : "absent");
  }
  return map;
}

export function useAttendanceRoster(
  academicProgramId: number,
  initialColumns: RosterSessionColumn[],
  members: AcademicProgramMember[],
): AttendanceRosterView {
  /*
   * 회차별 상태(출석부 줄 + 합계)를 sessionId로 쥔다. 초깃값은 로더가 넘긴 값이라 동기화용
   * useEffect 가 없다(AGENTS.md — 상위가 ready 전에는 마운트하지 않는다).
   */
  const [cellMaps, setCellMaps] = useState<Map<number, Map<number, RosterCellState>>>(
    () => new Map(initialColumns.map((col) => [col.session.sessionId, toCellMap(col)])),
  );
  const [summaries, setSummaries] = useState<Map<number, { present: number; total: number }>>(
    () =>
      new Map(
        initialColumns.map((col) => [
          col.session.sessionId,
          { present: col.session.presentCount, total: col.session.totalCount },
        ]),
      ),
  );
  const [savingIds, setSavingIds] = useState<ReadonlySet<number>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  // 회차 순서·계획일 같은 불변 정보는 초기 배열을 그대로 본다(정정이 바꾸지 않는다)
  const sessionOrder = useMemo(
    () => initialColumns.map((col) => col.session),
    [initialColumns],
  );
  const pendingRef = useRef<Set<number>>(new Set());

  const clearError = useCallback(() => setError(null), []);

  const toggleCell = useCallback(
    (sessionId: number, eventPtcpId: number) => {
      setError(null);

      const session = sessionOrder.find((s) => s.sessionId === sessionId);
      if (!session || session.sesnSttsCd === "APPROVED") return;
      if (pendingRef.current.has(sessionId)) return;

      const currentMap = cellMaps.get(sessionId);
      const cell = currentMap?.get(eventPtcpId);
      // 출석부에 줄이 없는 팀원은 여기서 바꾸지 않는다(명단 변경은 재제출의 몫 · 서버 400)
      if (cell !== "present" && cell !== "absent") return;

      const nextYn = cell !== "present";

      pendingRef.current.add(sessionId);
      setSavingIds((prev) => new Set(prev).add(sessionId));

      void (async () => {
        try {
          const result = await correctSessionAttendances(academicProgramId, sessionId, [
            { eventPtcpId, atndYn: nextYn },
          ]);
          // 응답의 갱신된 명단 + 다시 센 집계로 이 회차 열 하나만 갈아 끼운다(부분 갱신)
          const nextMap = new Map<number, RosterCellState>();
          for (const row of result.attendances) {
            nextMap.set(row.eventPtcpId, row.atndYn ? "present" : "absent");
          }
          setCellMaps((prev) => new Map(prev).set(sessionId, nextMap));
          setSummaries((prev) =>
            new Map(prev).set(sessionId, {
              present: result.presentCount,
              total: result.totalCount,
            }),
          );
        } catch (err: unknown) {
          // 낙관적 갱신을 하지 않았으므로 되돌릴 것이 없다 — 문구만 남긴다
          setError(correctAttendanceErrorMessage(err));
        } finally {
          pendingRef.current.delete(sessionId);
          setSavingIds((prev) => {
            const next = new Set(prev);
            next.delete(sessionId);
            return next;
          });
        }
      })();
    },
    [academicProgramId, cellMaps, sessionOrder],
  );

  /* ── 파생: 열 ──────────────────────────────────────────────── */
  const columns = useMemo<RosterColumn[]>(
    () =>
      sessionOrder.map((session) => ({
        session,
        locked: session.sesnSttsCd === "APPROVED",
        saving: savingIds.has(session.sessionId),
        cellByMember: cellMaps.get(session.sessionId) ?? new Map(),
      })),
    [sessionOrder, savingIds, cellMaps],
  );

  /* ── 파생: 행(팀원별 출석률) ───────────────────────────────── */
  const rows = useMemo<RosterRow[]>(
    () =>
      members.map((member) => {
        let counted = 0;
        let present = 0;
        for (const column of columns) {
          const cell = column.cellByMember.get(member.eventPtcpId);
          if (cell === "present") {
            counted += 1;
            present += 1;
          } else if (cell === "absent") {
            counted += 1;
          }
        }
        const rate = attendanceRatePercent(present, counted);
        return {
          member,
          countedSessions: counted,
          presentCount: present,
          rate,
          low: isLowAttendanceRate(rate),
        };
      }),
    [members, columns],
  );

  /* ── 파생: 기간 평균 (서버 회차별 합계만으로) ──────────────── */
  const periodAverage = useMemo(() => {
    let present = 0;
    let total = 0;
    for (const session of sessionOrder) {
      const summary = summaries.get(session.sessionId);
      if (summary) {
        present += summary.present;
        total += summary.total;
      }
    }
    return attendanceRatePercent(present, total);
  }, [sessionOrder, summaries]);

  const sessionRangeLabel = useMemo(() => {
    const seqs = sessionOrder
      .map((s) => s.seqno)
      .filter((n): n is number => n !== null);
    if (seqs.length === 0) return "";
    const min = Math.min(...seqs);
    const max = Math.max(...seqs);
    return min === max ? `${min}회차` : `${min} ~ ${max}회차`;
  }, [sessionOrder]);

  return {
    rows,
    columns,
    periodAverage,
    sessionRangeLabel,
    error,
    toggleCell,
    clearError,
  };
}
