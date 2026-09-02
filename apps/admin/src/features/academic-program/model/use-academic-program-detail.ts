"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ACADEMIC_PROGRAM_ERROR,
  fetchAcademicProgram,
  type AcademicProgramDetail,
} from "@/entities/academic-program";
import { ApiError } from "@/shared/lib/api/client";
import { toAcademicProgramErrorMessage } from "./academic-program-error";

/*
 * 학술 활동 단건 조회 훅 (#125 · GET /v1/academic-programs/{id}).
 *
 * 구조의 근거는 features/work/model/use-work-detail.ts와 같다. "없는 활동"을 오류가
 * 아니라 별도 상태로 나눈 것도 같은 이유다 — 오류는 재시도 버튼을 주지만, 없는 활동은
 * 아무리 다시 불러도 없다. 목록으로 돌아갈 길을 준다. 학술 활동은 소프트 삭제가 없어
 * 존재하면 항상 조회되고, 없으면 404 `ACADEMIC_PROGRAM_NOT_FOUND`다.
 */

export type AcademicProgramDetailStatus =
  | "loading"
  | "ready"
  | "not-found"
  | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedDetail {
  key: string;
  program: AcademicProgramDetail | null;
  outcome: Exclude<AcademicProgramDetailStatus, "loading">;
  errorMessage: string;
}

export interface AcademicProgramDetailQuery {
  program: AcademicProgramDetail | null;
  status: AcademicProgramDetailStatus;
  errorMessage: string;
  reload: () => void;
}

export function useAcademicProgramDetail(
  academicProgramId: number,
): AcademicProgramDetailQuery {
  const [loaded, setLoaded] = useState<LoadedDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${academicProgramId}|${reloadKey}`;

  /*
   * URL의 id는 사용자가 손으로 고칠 수 있다. 숫자가 아니면 서버까지 갈 것 없이 없는
   * 활동으로 끊는다 — `/v1/academic-programs/NaN` 같은 요청이 나가는 것을 막는다.
   */
  const isFetchable =
    Number.isInteger(academicProgramId) && academicProgramId > 0;

  useEffect(() => {
    if (!isFetchable) return;

    let alive = true;

    fetchAcademicProgram(academicProgramId)
      .then((next) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            program: next,
            outcome: "ready",
            errorMessage: "",
          });
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;

        const notFound =
          error instanceof ApiError &&
          error.code === ACADEMIC_PROGRAM_ERROR.ACADEMIC_PROGRAM_NOT_FOUND;

        setLoaded({
          key: requestKey,
          program: null,
          outcome: notFound ? "not-found" : "error",
          errorMessage: notFound ? "" : toAcademicProgramErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [academicProgramId, isFetchable, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: AcademicProgramDetailStatus = !isFetchable
    ? "not-found"
    : (current?.outcome ?? "loading");

  return {
    program: status === "ready" ? (current?.program ?? null) : null,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
