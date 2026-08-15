"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchRoleClassifications,
  fetchRoles,
  type RoleClassification,
  type RoleSummary,
} from "@/entities/role";
import { syncSessionOnForbidden } from "@/entities/session";
import { toRoleClassificationErrorMessage, toRoleErrorMessage } from "./role-error";

/*
 * 역할 목록 화면(/members/roles)의 조회 (#49 · 서버 #79 · #80).
 *
 * 역할과 분류를 **한 훅에서 함께** 받는다. 분류는 필터 칩을 그리는 데만 쓰이지만 두 요청이
 * 같은 화면 하나를 채우므로 나누면 로딩이 두 단계로 보인다.
 *
 * ── 로딩을 setState 하지 않는다 ────────────────────────────────
 * features/form/model/use-form-list.ts 의 결정을 그대로 따른다 — 결과에 요청 key 를 달아 두고
 * 렌더 중에 loading 을 파생시킨다(react-hooks/set-state-in-effect).
 *
 * ── 분류 조회 실패는 화면을 막지 않는다 ─────────────────────────
 * 두 API 의 인가가 갈린다. 역할은 조회부터 ROLE_MANAGE 를 요구하지만 분류 조회는 인증만
 * 요구하므로, 역할이 왔는데 분류만 실패하는 것은 사실상 네트워크 사고다. 그때 표까지 오류로
 * 덮으면 볼 수 있는 것을 못 보게 된다 — 칩 줄에만 조용히 알리고 표는 그대로 그린다.
 */

export type RoleListStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedRoleList {
  key: number;
  roles: RoleSummary[];
  classifications: RoleClassification[];
  /** 빈 문자열이면 성공. 채워져 있으면 역할 목록 자체를 받지 못한 것이다 */
  errorMessage: string;
  /** 분류만 실패한 경우. 표는 그대로 그리고 칩 줄에만 알린다 */
  classificationErrorMessage: string;
}

export interface RoleList {
  roles: RoleSummary[];
  classifications: RoleClassification[];
  status: RoleListStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  /** 비어 있으면 정상 — 분류 칩 줄에만 표시한다 */
  classificationErrorMessage: string;
  reload: () => void;
}

export function useRoleList(): RoleList {
  const [loaded, setLoaded] = useState<LoadedRoleList | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let alive = true;

    /*
     * 분류 실패를 여기서 잡아 두면 Promise.all 이 역할까지 함께 버리지 않는다 — 둘 중 하나만
     * 실패하는 경우를 화면이 다르게 다뤄야 하므로 실패를 값으로 바꿔 넘긴다.
     */
    const classifications = fetchRoleClassifications().then(
      (list) => ({ list, errorMessage: "" }),
      (error: unknown) => ({
        list: [] as RoleClassification[],
        errorMessage: toRoleClassificationErrorMessage(error),
      }),
    );

    Promise.all([fetchRoles(), classifications])
      .then(([roles, clsf]) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          roles,
          classifications: clsf.list,
          errorMessage: "",
          classificationErrorMessage: clsf.errorMessage,
        });
      })
      .catch((error: unknown) => {
        // 화면이 열린 사이에 권한이 회수됐을 수 있다 — 세션을 맞춰 화면이 스스로 닫히게 한다
        syncSessionOnForbidden(error);
        if (!alive) return;
        setLoaded({
          key: requestKey,
          roles: [],
          classifications: [],
          errorMessage: toRoleErrorMessage(error),
          classificationErrorMessage: "",
        });
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: RoleListStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  const reload = useCallback(() => setRequestKey((k) => k + 1), []);

  return {
    roles: current?.roles ?? [],
    classifications: current?.classifications ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    classificationErrorMessage: current?.classificationErrorMessage ?? "",
    reload,
  };
}
