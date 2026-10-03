"use client";

import { useEffect, useState } from "react";
import { fetchWorkTags, type WorkTag } from "@/entities/work";
import { toWorkTagListErrorMessage } from "./work-tag-error";

/*
 * 고를 수 있는 업무 태그 후보 (#757) — 업무 목록의 태그 필터 칩과 지정 칩이 쓴다.
 *
 * 관리 훅과 나눈 것은 폼 라벨 후보(use-form-label-options)와 같은 이유다 — 칩을 누를 때마다 업무
 * 목록은 다시 부르지만 태그 후보는 그대로다. 실패해도 화면을 막지 않는다(필터 줄·지정 칸에만 표시).
 */

export interface WorkTagOptions {
  tags: WorkTag[];
  loading: boolean;
  /** 비어 있으면 정상 */
  errorMessage: string;
}

export function useWorkTagOptions(): WorkTagOptions {
  const [tags, setTags] = useState<WorkTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let alive = true;

    fetchWorkTags()
      .then((next) => {
        if (alive) setTags(next);
      })
      .catch((error: unknown) => {
        if (alive) setErrorMessage(toWorkTagListErrorMessage(error));
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
