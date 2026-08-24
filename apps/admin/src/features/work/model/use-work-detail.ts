"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWork, WORK_ERROR, type WorkDetail } from "@/entities/work";
import { ApiError } from "@/shared/lib/api/client";
import { toWorkErrorMessage } from "./work-error";

/*
 * 업무 단건 조회 훅 (OPS-003). 구조의 근거는 features/form/model/use-form-detail.ts와 같다.
 *
 * "없는 업무"를 오류가 아니라 별도 상태로 나눈 것도 같은 이유다 — 오류는 재시도 버튼을
 * 주지만, 없는 업무는 아무리 다시 불러도 없다. 목록으로 돌아갈 길을 준다.
 * 소프트 삭제된 업무도 여기로 떨어진다(서버가 404로 막는다).
 */

export type WorkDetailStatus = "loading" | "ready" | "not-found" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedWorkDetail {
  key: string;
  work: WorkDetail | null;
  outcome: Exclude<WorkDetailStatus, "loading">;
  errorMessage: string;
}

export interface WorkDetailQuery {
  work: WorkDetail | null;
  status: WorkDetailStatus;
  errorMessage: string;
  reload: () => void;
}

export function useWorkDetail(workId: number): WorkDetailQuery {
  const [loaded, setLoaded] = useState<LoadedWorkDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${workId}|${reloadKey}`;

  /*
   * URL의 workId는 사용자가 손으로 고칠 수 있다. 숫자가 아니면 서버까지 갈 것 없이 없는
   * 업무로 끊는다 — `/v1/works/NaN` 같은 요청이 나가는 것을 막는다.
   */
  const isFetchable = Number.isInteger(workId) && workId > 0;

  useEffect(() => {
    if (!isFetchable) return;

    let alive = true;

    fetchWork(workId)
      .then((next) => {
        if (alive) {
          setLoaded({ key: requestKey, work: next, outcome: "ready", errorMessage: "" });
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;

        const notFound =
          error instanceof ApiError && error.code === WORK_ERROR.WORK_NOT_FOUND;

        setLoaded({
          key: requestKey,
          work: null,
          outcome: notFound ? "not-found" : "error",
          errorMessage: notFound ? "" : toWorkErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [workId, isFetchable, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: WorkDetailStatus = !isFetchable
    ? "not-found"
    : (current?.outcome ?? "loading");

  return {
    work: status === "ready" ? (current?.work ?? null) : null,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
