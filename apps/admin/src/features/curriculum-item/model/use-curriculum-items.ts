"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchCurriculumItems } from "@/entities/academic-program";
import type { CurriculumItemWithSession } from "@/entities/curriculum-item";
import { toAcademicProgramErrorMessage } from "@/features/academic-program";

/*
 * 커리큘럼 대비 진행 조회 훅 (#125 · GET /v1/academic-programs/{id}/curriculum-items).
 *
 * 활동 상세 화면의 "커리큘럼 대비 진행" 표 하나가 이 배열을 그대로 쓴다. 페이징이 없고
 * (활동당 회차 수가 적다) 조회에 인증만 요구하므로, 로딩·오류·재조회만 쥐는 얇은 훅이다.
 * 오류 문구는 활동 조회와 같은 매핑(toAcademicProgramErrorMessage)을 쓴다 — 같은 도메인의
 * 같은 인가라 문장을 갈라 둘 이유가 없다.
 *
 * 커리큘럼 조회가 실패해도 활동 상세 자체는 이미 그려진 상태다 — 그래서 이 표만 오류
 * 블록으로 대체하고 화면 전체를 오류로 덮지 않는다(화면 쪽 책임).
 */

export type CurriculumItemsStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedItems {
  key: string;
  items: CurriculumItemWithSession[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface CurriculumItems {
  items: CurriculumItemWithSession[];
  status: CurriculumItemsStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

export function useCurriculumItems(academicProgramId: number): CurriculumItems {
  const [loaded, setLoaded] = useState<LoadedItems | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${academicProgramId}|${reloadKey}`;
  const isFetchable =
    Number.isInteger(academicProgramId) && academicProgramId > 0;

  useEffect(() => {
    if (!isFetchable) return;

    let alive = true;

    fetchCurriculumItems(academicProgramId)
      .then((items) => {
        if (alive) setLoaded({ key: requestKey, items, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            items: [],
            errorMessage: toAcademicProgramErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [academicProgramId, isFetchable, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: CurriculumItemsStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    items: current?.items ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
