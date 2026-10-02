"use client";

import { useCallback, useEffect, useState } from "react";
import type { AcademicProgramMemberHistory } from "@/entities/academic-program";
// 배럴은 서버 전용 조회를 품는다 — 브라우저 모듈은 직접 가져온다
import { fetchAcademicProgramMemberHistory } from "@/entities/academic-program/api/members-write";
import { toMemberHistoryErrorMessage } from "./team-members-error";

/*
 * 팀원 명단 변경 이력 — **펼칠 때 부른다** (#742 · server#612 · GET .../members/history).
 *
 * 명단 화면을 열 때마다 이력까지 받지 않는다 — 대부분은 명단만 보고 나간다(어드민 하위 업무의
 * «점검 목록 변경 이력»과 같은 판단). 절을 연 동안 명단을 바꾸면(`version`이 오르면) 다시 읽는다.
 *
 * 결과에 요청 식별자를 실어 로딩을 파생시킨다 — 어드민 목록 훅들과 같은 모양이라 effect 안에서
 * «로딩 중»을 따로 세우지 않는다.
 */

export type MemberHistoryStatus = "idle" | "loading" | "ready" | "error";

interface Loaded {
  key: string;
  items: AcademicProgramMemberHistory[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface MemberHistory {
  status: MemberHistoryStatus;
  items: AcademicProgramMemberHistory[];
  errorMessage: string;
  reload: () => void;
}

export function useMemberHistory(
  academicProgramId: number,
  /** 절이 펼쳐져 있는가 — 닫혀 있으면 부르지 않는다 */
  open: boolean,
  /** 명단을 바꾼 횟수(`useTeamMemberActions`) — 오르면 다시 읽는다 */
  version: number,
): MemberHistory {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const key = `${academicProgramId}|${version}|${reloadKey}`;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchAcademicProgramMemberHistory(academicProgramId)
      .then((items) => {
        if (alive) setLoaded({ key, items, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) setLoaded({ key, items: [], errorMessage: toMemberHistoryErrorMessage(error) });
      });
    return () => {
      alive = false;
    };
    // key가 academicProgramId·version·reloadKey를 모두 담는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === key ? loaded : null;
  const status: MemberHistoryStatus = !open
    ? "idle"
    : current === null
      ? "loading"
      : current.errorMessage
        ? "error"
        : "ready";

  return {
    status,
    items: current?.items ?? [],
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
