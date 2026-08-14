"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchForm, FORM_ERROR, type FormDetail } from "@/entities/form";
import { ApiError } from "@/shared/lib/api/client";
import { toFormErrorMessage } from "./form-error";

/*
 * 폼 단건 조회 훅. 페칭 방식의 근거는 use-form-list.ts 주석 참고.
 *
 * "없는 폼"을 오류가 아니라 별도 상태로 나눈 것은 화면 처리가 다르기 때문이다 — 오류는
 * 재시도 버튼을 주지만, 없는 폼은 아무리 다시 불러도 없다. 목록으로 돌아갈 길을 준다.
 */

export type FormDetailStatus = "loading" | "ready" | "not-found" | "error";

export interface FormDetailQuery {
  form: FormDetail | null;
  status: FormDetailStatus;
  errorMessage: string;
  reload: () => void;
}

export function useFormDetail(formId: number): FormDetailQuery {
  const [form, setForm] = useState<FormDetail | null>(null);
  const [status, setStatus] = useState<FormDetailStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus("loading");

    /*
     * URL의 formId는 사용자가 손으로 고칠 수 있다. 숫자가 아니면 서버까지 갈 것 없이
     * 없는 폼으로 끊는다 — /v1/forms/NaN 같은 요청이 나가는 것을 막는다.
     */
    if (!Number.isInteger(formId) || formId <= 0) {
      setForm(null);
      setStatus("not-found");
      return () => {
        alive = false;
      };
    }

    fetchForm(formId)
      .then((next) => {
        if (!alive) return;
        setForm(next);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!alive) return;
        if (error instanceof ApiError && error.code === FORM_ERROR.FORM_NOT_FOUND) {
          setForm(null);
          setStatus("not-found");
          return;
        }
        setErrorMessage(toFormErrorMessage(error));
        setStatus("error");
      });

    return () => {
      alive = false;
    };
  }, [formId, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { form, status, errorMessage, reload };
}
