"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAcademicProgramMemberHistory,
  fetchAcademicProgramMembers,
  type AcademicProgramMemberHistory,
  type RecruitmentTeamMember,
} from "@/entities/academic-program";
import {
  toAcademicProgramErrorMessage,
  toProgramMemberHistoryErrorMessage,
} from "./academic-program-error";

/*
 * 프로그램 상세의 «팀원» 절 조회 훅 둘 (#742 · server#612).
 *
 * - `useProgramMembers` — 명단 전부(확정·대기·취소). 상세와 함께 부른다. 조회에 인증만 요구하고
 *   페이징이 없어 커리큘럼 훅(`useCurriculumItems`)과 같은 얇은 모양이다. 실패해도 상세는 이미
 *   그려져 있어 이 절만 오류 블록이 된다(화면 책임).
 * - `useProgramMemberHistory` — 명단 변경 이력. **펼칠 때 부른다** — 대부분은 명단만 보고
 *   나간다(하위 업무 «점검 목록 변경 이력»과 같은 판단). 스터디장 본인 또는 학술국장만 볼 수 있다.
 *
 * 이 절은 **조회만**이다 — 넣고 빼는 것은 스터디장이 LMS에서 한다. 그래서 명단을 바꾼 뒤 다시
 * 읽는 신호(`version`)가 없다.
 *
 * 결과에 요청 식별자를 실어 로딩을 파생시키는 구조는 이 슬라이스의 다른 조회 훅과 같다.
 */

export type ProgramMembersStatus = "loading" | "ready" | "error";

interface LoadedMembers {
  key: string;
  members: RecruitmentTeamMember[];
  errorMessage: string;
}

export interface ProgramMembers {
  members: RecruitmentTeamMember[];
  status: ProgramMembersStatus;
  errorMessage: string;
  reload: () => void;
}

export function useProgramMembers(academicProgramId: number): ProgramMembers {
  const [loaded, setLoaded] = useState<LoadedMembers | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${academicProgramId}|${reloadKey}`;

  useEffect(() => {
    let alive = true;
    fetchAcademicProgramMembers(academicProgramId)
      .then((members) => {
        if (alive) setLoaded({ key: requestKey, members, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            members: [],
            errorMessage: toAcademicProgramErrorMessage(error),
          });
        }
      });
    return () => {
      alive = false;
    };
  }, [academicProgramId, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: ProgramMembersStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    members: current?.members ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}

export type ProgramMemberHistoryStatus = "idle" | "loading" | "ready" | "error";

interface LoadedHistory {
  key: string;
  items: AcademicProgramMemberHistory[];
  errorMessage: string;
}

export interface ProgramMemberHistory {
  items: AcademicProgramMemberHistory[];
  status: ProgramMemberHistoryStatus;
  errorMessage: string;
  reload: () => void;
}

export function useProgramMemberHistory(
  academicProgramId: number,
  /** 절이 펼쳐져 있는가 — 닫혀 있으면 부르지 않는다 */
  open: boolean,
): ProgramMemberHistory {
  const [loaded, setLoaded] = useState<LoadedHistory | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${academicProgramId}|${reloadKey}`;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchAcademicProgramMemberHistory(academicProgramId)
      .then((items) => {
        if (alive) setLoaded({ key: requestKey, items, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            items: [],
            errorMessage: toProgramMemberHistoryErrorMessage(error),
          });
        }
      });
    return () => {
      alive = false;
    };
  }, [academicProgramId, open, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: ProgramMemberHistoryStatus = !open
    ? "idle"
    : current === null
      ? "loading"
      : current.errorMessage
        ? "error"
        : "ready";

  return {
    items: current?.items ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
