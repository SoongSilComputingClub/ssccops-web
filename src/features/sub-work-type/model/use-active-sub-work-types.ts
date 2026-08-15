"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchSubWorkTypes, type SubWorkTypeSummary } from "@/entities/sub-work-type";
import { toSubWorkTypeErrorMessage } from "./sub-work-type-error";

/*
 * 하위 업무 등록 폼의 '하위_업무_유형' 선택지 (OPS-018 · #36).
 *
 * 관리 화면의 useSubWorkTypes와 훅을 나눈 것은 **부르는 조건이 다르기 때문이다**:
 * 여기서는 `useYn=true`로 사용 중인 유형만 받는다. 꺼진 유형까지 고를 수 있게 두면 서버가
 * 400 SUB_WORK_TYPE_INACTIVE로 끊는데, 사용자 눈에는 목록에 있던 유형을 골랐을 뿐이다.
 * 반대로 관리 화면이 활성만 받으면 방금 끈 유형이 사라져 되돌릴 수 없다 — 같은 목록이지만
 * 두 화면이 서로 다른 것을 봐야 한다.
 *
 * 로딩을 setState 하지 않는 방식(결과에 요청 key를 실어 두고 렌더 중에 계산)은 폼_라벨·유형
 * 관리 훅과 같다 (react-hooks/set-state-in-effect).
 */

export type ActiveSubWorkTypesStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedTypes {
  key: number;
  types: SubWorkTypeSummary[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface ActiveSubWorkTypes {
  /** 사용 중(useYn = true)인 유형만. 등록 폼은 이 중에서 하나만 고른다 */
  types: SubWorkTypeSummary[];
  status: ActiveSubWorkTypesStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

/**
 * @param enabled 하위 업무 폼을 그리는 화면에서만 true. 운영 등록 화면은 업무·회의도 함께
 *   다루는데, 그때까지 유형 목록을 부르면 쓰지도 않을 응답과 그 오류 상태가 따라온다.
 */
export function useActiveSubWorkTypes(enabled = true): ActiveSubWorkTypes {
  const [loaded, setLoaded] = useState<LoadedTypes | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let alive = true;

    fetchSubWorkTypes(true)
      .then((types) => {
        if (alive) setLoaded({ key: requestKey, types, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            types: [],
            errorMessage: toSubWorkTypeErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [enabled, requestKey]);

  const reload = useCallback(() => setRequestKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: ActiveSubWorkTypesStatus = !enabled
    ? "ready"
    : current === null
      ? "loading"
      : current.errorMessage
        ? "error"
        : "ready";

  return {
    types: enabled ? (current?.types ?? []) : [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
