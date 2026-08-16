"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchFormResponse,
  RESPONSE_ERROR,
  type FormResponseDetail,
} from "@/entities/response";
import { ApiError } from "@/shared/lib/api/client";
import { toResponseErrorMessage } from "./response-error";

/*
 * 응답 단건 조회 훅. 구조의 근거는 features/form/model/use-form-detail.ts 주석 참고.
 *
 * "없는 응답"을 오류가 아니라 별도 상태로 나눈 것은 화면 처리가 다르기 때문이다 — 오류는
 * 재시도 버튼을 주지만, 없는 응답은 아무리 다시 불러도 없다.
 *
 * **다른 폼의 응답 ID도 여기로 떨어진다.** 서버는 경로의 formId 범위를 검사해 404
 * FORM_RESPONSE_NOT_FOUND를 주므로(#37), `/forms/1/responses/999`에 999가 2번 폼의
 * 응답이면 화면은 "찾을 수 없음"이 된다 — 웹이 따로 소유권을 검사하지 않는다.
 */

export type ResponseDetailStatus = "loading" | "ready" | "not-found" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedResponseDetail {
  key: string;
  response: FormResponseDetail | null;
  outcome: Exclude<ResponseDetailStatus, "loading">;
  errorMessage: string;
}

export interface ResponseDetailQuery {
  response: FormResponseDetail | null;
  status: ResponseDetailStatus;
  errorMessage: string;
  reload: () => void;
}

export function useResponseDetail(
  formId: number,
  formRspnsId: number,
): ResponseDetailQuery {
  const [loaded, setLoaded] = useState<LoadedResponseDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${formId}|${formRspnsId}|${reloadKey}`;

  /*
   * URL의 두 ID는 사용자가 손으로 고칠 수 있다. 숫자가 아니면 서버까지 갈 것 없이 없는
   * 응답으로 끊는다 — `/v1/forms/NaN/responses/NaN` 같은 요청이 나가는 것을 막는다.
   * 조회가 필요 없는 판정이므로 상태로 저장하지 않고 렌더 중에 그대로 계산한다.
   */
  const isFetchable =
    Number.isInteger(formId) &&
    formId > 0 &&
    Number.isInteger(formRspnsId) &&
    formRspnsId > 0;

  useEffect(() => {
    if (!isFetchable) return;

    let alive = true;

    fetchFormResponse(formId, formRspnsId)
      .then((next) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            response: next,
            outcome: "ready",
            errorMessage: "",
          });
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;

        const notFound =
          error instanceof ApiError &&
          error.code === RESPONSE_ERROR.FORM_RESPONSE_NOT_FOUND;

        setLoaded({
          key: requestKey,
          response: null,
          outcome: notFound ? "not-found" : "error",
          errorMessage: notFound ? "" : toResponseErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [formId, formRspnsId, isFetchable, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;

  let status: ResponseDetailStatus;
  if (!isFetchable) {
    status = "not-found";
  } else {
    status = current?.outcome ?? "loading";
  }

  return {
    response: status === "ready" ? (current?.response ?? null) : null,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
