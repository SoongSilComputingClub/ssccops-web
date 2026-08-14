"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchForm, FORM_ERROR, type FormDetail } from "@/entities/form";
import { ApiError } from "@/shared/lib/api/client";
import { toFormErrorMessage } from "./form-error";

/*
 * 폼 단건 조회 훅. 페칭 방식과 "결과에 요청 식별자를 실어 로딩을 파생시키는" 구조의 근거는
 * use-form-list.ts 주석 참고.
 *
 * "없는 폼"을 오류가 아니라 별도 상태로 나눈 것은 화면 처리가 다르기 때문이다 — 오류는
 * 재시도 버튼을 주지만, 없는 폼은 아무리 다시 불러도 없다. 목록으로 돌아갈 길을 준다.
 */

export type FormDetailStatus = "loading" | "ready" | "not-found" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedFormDetail {
  key: string;
  form: FormDetail | null;
  outcome: Exclude<FormDetailStatus, "loading">;
  errorMessage: string;
}

export interface FormDetailQuery {
  form: FormDetail | null;
  status: FormDetailStatus;
  errorMessage: string;
  reload: () => void;
}

export function useFormDetail(formId: number): FormDetailQuery {
  const [loaded, setLoaded] = useState<LoadedFormDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${formId}|${reloadKey}`;

  /*
   * URL의 formId는 사용자가 손으로 고칠 수 있다. 숫자가 아니면 서버까지 갈 것 없이 없는 폼으로
   * 끊는다 — `/v1/forms/NaN` 같은 요청이 나가는 것을 막는다. 조회가 필요 없는 판정이므로
   * 상태로 저장하지 않고 렌더 중에 그대로 계산한다.
   */
  const isFetchable = Number.isInteger(formId) && formId > 0;

  useEffect(() => {
    if (!isFetchable) return;

    let alive = true;

    fetchForm(formId)
      .then((next) => {
        if (alive) {
          setLoaded({ key: requestKey, form: next, outcome: "ready", errorMessage: "" });
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;

        const notFound =
          error instanceof ApiError && error.code === FORM_ERROR.FORM_NOT_FOUND;

        setLoaded({
          key: requestKey,
          form: null,
          outcome: notFound ? "not-found" : "error",
          errorMessage: notFound ? "" : toFormErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [formId, isFetchable, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;

  let status: FormDetailStatus;
  if (!isFetchable) {
    status = "not-found";
  } else {
    status = current?.outcome ?? "loading";
  }

  return {
    form: status === "ready" ? (current?.form ?? null) : null,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
