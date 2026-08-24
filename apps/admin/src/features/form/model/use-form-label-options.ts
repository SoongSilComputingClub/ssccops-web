"use client";

import { useEffect, useState } from "react";
import { fetchFormLabels, type FormLabelSummary } from "@/entities/form";
import { toFormErrorMessage } from "./form-error";

/*
 * 필터·편집기가 고를 수 있는 라벨 후보(활성 라벨만).
 *
 * 목록 조회와 분리한 것은 갱신 주기가 다르기 때문이다 — 필터를 누를 때마다 폼 목록은 다시
 * 부르지만 라벨 후보는 그대로다. 한 훅에 묶으면 칩을 누를 때마다 라벨까지 다시 받는다.
 *
 * 실패해도 화면을 막지 않는다. 라벨 후보가 없으면 상태 필터만 쓸 수 있으면 되고, 목록 자체는
 * 이미 떠 있기 때문이다 — 여기서 화면 전체를 오류로 바꾸면 손해가 더 크다.
 */

export interface FormLabelOptions {
  labels: FormLabelSummary[];
  loading: boolean;
  /** 비어 있으면 정상 — 라벨 줄에만 조용히 표시한다 */
  errorMessage: string;
}

export function useFormLabelOptions(): FormLabelOptions {
  const [labels, setLabels] = useState<FormLabelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let alive = true;

    fetchFormLabels(true)
      .then((next) => {
        if (alive) setLabels(next);
      })
      .catch((error: unknown) => {
        if (alive) setErrorMessage(toFormErrorMessage(error));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { labels, loading, errorMessage };
}
