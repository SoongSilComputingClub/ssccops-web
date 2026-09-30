"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAssignableMembers, type AssignableMember } from "@/entities/member";
import { toAddCandidatesErrorMessage } from "./team-members-error";

/*
 * 팀원 추가 시트의 회원 목록 (#742 · GET /v1/members/assignable).
 *
 * **시트를 열 때마다** 부른다(`openKey`가 바뀔 때) — 명단 화면을 그릴 때 동아리 회원 전량을 받지
 * 않고, 열어 둔 사이 가입·탈퇴가 있었으면 다음에 열 때 반영된다.
 *
 * 이미 확정·대기인 사람을 빼는 것은 여기가 아니라 시트가 한다(명단은 서버 렌더에서 오는 값이라
 * 시트가 들고 있다). 제외된 사람은 빼지 않는다 — 추가하면 재합류다(server#612).
 */

export type AddCandidatesStatus = "idle" | "loading" | "ready" | "error";

interface Loaded {
  key: string;
  members: AssignableMember[];
  errorMessage: string;
}

export interface AddCandidates {
  status: AddCandidatesStatus;
  members: AssignableMember[];
  errorMessage: string;
  reload: () => void;
}

/** `openKey`가 null이면 시트가 닫혀 있다 — 부르지 않는다 */
export function useAddCandidates(openKey: number | null): AddCandidates {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const key = openKey === null ? null : `${openKey}|${reloadKey}`;

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    fetchAssignableMembers()
      .then((members) => {
        if (alive) setLoaded({ key, members, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) setLoaded({ key, members: [], errorMessage: toAddCandidatesErrorMessage(error) });
      });
    return () => {
      alive = false;
    };
  }, [key]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = key !== null && loaded?.key === key ? loaded : null;
  const status: AddCandidatesStatus =
    key === null ? "idle" : current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    status,
    members: current?.members ?? [],
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
