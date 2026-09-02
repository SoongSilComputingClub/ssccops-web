"use client";

import { useCallback, useEffect, useState } from "react";
import {
  attendanceRatePercent,
  fetchAcademicProgramSessions,
  fetchSessionAttendances,
  isLowAttendanceRate,
  type SessionCrossListItem,
} from "@/entities/academic-session";
import { toSessionReviewErrorMessage } from "./session-review-error";

/*
 * 출석 통계 집계 훅 (#130).
 *
 * ── 이 훅이 유일한 집계 지점이다 ──────────────────────────────
 * 출석 통계 전용 엔드포인트가 없다(#130 「결정해서 남길 것」). 회차 이력·출석부 응답을
 * 웹에서 집계하는데, 그 계산이 여러 화면에 흩어지면 규칙이 두 벌이 되므로 전체 평균·
 * 활동별 출석률·70% 미만 회원 판정을 전부 이 훅에 가둔다. 다른 화면(활동 목록의 진행률
 * 열 등)이 출석률이 필요하면 이 훅을 부른다 — 화면이 다시 세지 않는다.
 *
 * ── 조회가 활동 수·회차 수에 비례한다 ────────────────────────
 *  - 전체 평균·활동별 출석률: 회차 이력(GET .../sessions)만 있으면 된다. 이력 한 줄이
 *    회차별 합계(presentCount/totalCount)를 주므로, 커서 페이징을 끝까지 순회해
 *    합/합으로 낸다 — 조회는 `ceil(전체 회차 수 / PAGE_SIZE)`회.
 *  - 70% 미만 회원: 회원별 내역이 이력 줄에 없다. 회차마다 출석부(GET .../attendances)를
 *    한 번씩 부른다 — 회차 수만큼(N)이다.
 *
 * 한 학기 전체 활동의 회차 합계는 대개 수십~백여 건이라 SSR 없이 한 번에 흡수된다. 활동이
 * 크게 늘어 이 순회가 느려지면 서버에 출석 통계 집계 API 를 요청한다 — 그 판단 기준을
 * 여기 남긴다(#130 결정 사항).
 *
 * ── 집계 규칙 ────────────────────────────────────────────────
 *  - 회차별 합계는 서버가 준 presentCount/totalCount 를 그대로 쓴다(웹 재계산 금지 —
 *    #172 출석부 화면과 같은 규칙).
 *  - 전체 평균 = ΣpresentCount / ΣtotalCount (회차 평균의 평균이 아니라 사람-회차 기준).
 *  - 활동별 출석률도 같은 방식으로 그 활동 회차들의 합/합.
 *  - 회원별 출석률 = 그 회원이 명단에 오른 회차 중 출석한 비율. 명단에 없는 회차는
 *    분모에서 뺀다(출석부에 줄이 없으면 셈에서 제외 — #172와 같다).
 *  - total 이 0인 축은 비율이 null 이다("0%"로 뭉개지 않는다).
 */

const PAGE_SIZE = 100;

export type AttendanceStatsStatus = "loading" | "ready" | "error";

/** 활동 하나의 출석률 — 막대 그래프 한 줄 */
export interface ProgramAttendanceRate {
  academicProgramId: number;
  academicProgramTitle: string;
  typeCd: string;
  /** 집계에 들어간 회차 수 */
  sessionCount: number;
  presentCount: number;
  totalCount: number;
  /** 정수 퍼센트. totalCount 가 0이면 null */
  rate: number | null;
}

/** 출석률이 낮은 회원 한 줄 */
export interface LowAttendanceMember {
  eventParticipantId: number;
  memberName: string;
  /** 이 회원이 명단에 오른 회차 수 */
  sessionCount: number;
  attendedCount: number;
  /** 정수 퍼센트. sessionCount 가 0이면 null(표에 오르지 않는다) */
  rate: number | null;
  /** 이 회원이 속한 활동 이름들 (중복 제거) */
  programTitles: string[];
}

export interface AttendanceStats {
  status: AttendanceStatsStatus;
  errorMessage: string;
  reload: () => void;

  /* 통계 카드 3개 */
  /** 집계에 들어간 회차 수 (전 활동) */
  totalSessionCount: number;
  /** 전체 평균 출석률 (정수 %). 회차가 없으면 null */
  overallRate: number | null;
  /** 70% 미만 회원 수 */
  lowAttendanceMemberCount: number;

  /* 표 */
  programRates: ProgramAttendanceRate[];
  lowAttendanceMembers: LowAttendanceMember[];
}

interface Loaded {
  key: string;
  totalSessionCount: number;
  overallRate: number | null;
  programRates: ProgramAttendanceRate[];
  lowAttendanceMembers: LowAttendanceMember[];
  errorMessage: string;
}

/** 커서 페이징을 끝까지 순회해 전 회차를 모은다 */
async function fetchAllSessions(): Promise<SessionCrossListItem[]> {
  const all: SessionCrossListItem[] = [];
  let cursor: string | null = null;

  // 무한 루프 방지 — 한 학기 회차 합계가 이 상한을 넘으면 서버 집계 API 를 붙일 때다
  for (let guard = 0; guard < 50; guard += 1) {
    const page = await fetchAcademicProgramSessions({
      size: PAGE_SIZE,
      cursor,
    });
    all.push(...page.sessions);
    if (!page.hasNext || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return all;
}

function aggregatePrograms(
  sessions: SessionCrossListItem[],
): ProgramAttendanceRate[] {
  const byProgram = new Map<number, ProgramAttendanceRate>();

  for (const s of sessions) {
    const existing = byProgram.get(s.academicProgramId);
    if (existing) {
      existing.sessionCount += 1;
      existing.presentCount += s.presentCount;
      existing.totalCount += s.totalCount;
    } else {
      byProgram.set(s.academicProgramId, {
        academicProgramId: s.academicProgramId,
        academicProgramTitle: s.academicProgramTitle,
        typeCd: s.typeCd,
        sessionCount: 1,
        presentCount: s.presentCount,
        totalCount: s.totalCount,
        rate: null,
      });
    }
  }

  const rows = Array.from(byProgram.values()).map((row) => ({
    ...row,
    rate: attendanceRatePercent(row.presentCount, row.totalCount),
  }));

  // 낮은 출석률이 위로 오게 — null(집계 대상 없음)은 맨 아래
  rows.sort((a, b) => {
    if (a.rate === null) return 1;
    if (b.rate === null) return -1;
    return a.rate - b.rate;
  });
  return rows;
}

interface MemberAccumulator {
  eventParticipantId: number;
  memberName: string;
  sessionCount: number;
  attendedCount: number;
  programTitles: Set<string>;
}

function buildLowAttendanceMembers(
  accumulators: Map<number, MemberAccumulator>,
): LowAttendanceMember[] {
  const rows: LowAttendanceMember[] = [];

  for (const acc of accumulators.values()) {
    const rate = attendanceRatePercent(acc.attendedCount, acc.sessionCount);
    if (!isLowAttendanceRate(rate)) continue;
    rows.push({
      eventParticipantId: acc.eventParticipantId,
      memberName: acc.memberName,
      sessionCount: acc.sessionCount,
      attendedCount: acc.attendedCount,
      rate,
      programTitles: Array.from(acc.programTitles),
    });
  }

  rows.sort((a, b) => {
    if (a.rate === null) return 1;
    if (b.rate === null) return -1;
    return a.rate - b.rate;
  });
  return rows;
}

export function useAttendanceStats(): AttendanceStats {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = String(reloadKey);

  useEffect(() => {
    let alive = true;

    (async () => {
      const sessions = await fetchAllSessions();

      const totalPresent = sessions.reduce((sum, s) => sum + s.presentCount, 0);
      const totalCount = sessions.reduce((sum, s) => sum + s.totalCount, 0);
      const overallRate = attendanceRatePercent(totalPresent, totalCount);
      const programRates = aggregatePrograms(sessions);

      // 회원별 출석률 — 회차마다 출석부를 한 번씩 부른다. 실패한 회차는 건너뛴다
      // (한 회차 출석부가 비어도 나머지 집계는 유효하다).
      const accumulators = new Map<number, MemberAccumulator>();
      const titleById = new Map(
        sessions.map((s) => [s.academicProgramId, s.academicProgramTitle]),
      );

      const perSession = await Promise.all(
        sessions.map(async (s) => {
          try {
            const rows = await fetchSessionAttendances(
              s.academicProgramId,
              s.sessionId,
            );
            return { academicProgramId: s.academicProgramId, rows };
          } catch {
            return { academicProgramId: s.academicProgramId, rows: [] };
          }
        }),
      );

      for (const { academicProgramId, rows } of perSession) {
        const title = titleById.get(academicProgramId) ?? "";
        for (const row of rows) {
          const acc = accumulators.get(row.eventParticipantId) ?? {
            eventParticipantId: row.eventParticipantId,
            memberName: row.memberName,
            sessionCount: 0,
            attendedCount: 0,
            programTitles: new Set<string>(),
          };
          acc.sessionCount += 1;
          if (row.atndYn) acc.attendedCount += 1;
          if (title) acc.programTitles.add(title);
          // 회원명이 뒤 회차에서 채워지는 경우가 있어 빈 값이면 갱신한다
          if (!acc.memberName && row.memberName) acc.memberName = row.memberName;
          accumulators.set(row.eventParticipantId, acc);
        }
      }

      if (!alive) return;
      setLoaded({
        key: requestKey,
        totalSessionCount: sessions.length,
        overallRate,
        programRates,
        lowAttendanceMembers: buildLowAttendanceMembers(accumulators),
        errorMessage: "",
      });
    })().catch((error: unknown) => {
      if (!alive) return;
      setLoaded({
        key: requestKey,
        totalSessionCount: 0,
        overallRate: null,
        programRates: [],
        lowAttendanceMembers: [],
        errorMessage: toSessionReviewErrorMessage(error),
      });
    });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: AttendanceStatsStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    totalSessionCount: current?.totalSessionCount ?? 0,
    overallRate: current?.overallRate ?? null,
    lowAttendanceMemberCount: current?.lowAttendanceMembers.length ?? 0,
    programRates: current?.programRates ?? [],
    lowAttendanceMembers: current?.lowAttendanceMembers ?? [],
  };
}
