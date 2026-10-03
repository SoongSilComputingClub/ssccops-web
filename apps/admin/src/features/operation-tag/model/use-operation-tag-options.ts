"use client";

import { useEffect, useState } from "react";
import { fetchOperationTags, type OperationTag } from "@/entities/operation-tag";
import { toOperationTagListErrorMessage } from "./operation-tag-error";

/*
 * 고를 수 있는 운영 태그 후보 (#757 · #771) — 업무·하위 업무·회의 목록과 운영 통합의 태그 필터 칩,
 * 세 상세와 업무 등록의 지정 칩이 쓴다.
 *
 * 관리 훅과 나눈 것은 폼 라벨 후보(use-form-label-options)와 같은 이유다 — 칩을 누를 때마다
 * 목록은 다시 부르지만 태그 후보는 그대로다. 실패해도 화면을 막지 않는다(필터 줄·지정 칸에만 표시).
 */

export interface OperationTagOptions {
  tags: OperationTag[];
  loading: boolean;
  /** 비어 있으면 정상 */
  errorMessage: string;
}

export function useOperationTagOptions(): OperationTagOptions {
  const [tags, setTags] = useState<OperationTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let alive = true;

    fetchOperationTags()
      .then((next) => {
        if (alive) setTags(next);
      })
      .catch((error: unknown) => {
        if (alive) setErrorMessage(toOperationTagListErrorMessage(error));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { tags, loading, errorMessage };
}
