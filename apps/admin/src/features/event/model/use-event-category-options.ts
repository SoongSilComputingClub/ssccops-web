"use client";

import { useEffect, useState } from "react";
import { fetchEventCategories, type EventCategory } from "@/entities/event";
import { toEventCategoryErrorMessage } from "./event-error";

/*
 * 목록 필터 칩·편집기 셀렉트가 고를 수 있는 분류 후보 (#136).
 *
 * 관리 화면의 훅(use-event-categories)과 분리한 것은 갱신 주기가 다르기 때문이다 — 저쪽은
 * 계속 고치고 이쪽은 한 번 받아 두면 끝이다. 한 훅에 합치면 필터 화면까지 관리 화면의 변이
 * 상태를 들고 다니게 된다(features/form의 use-form-label-options와 같은 분리).
 *
 * 실패해도 화면을 막지 않는다 — 분류 후보가 없으면 상태 필터만 쓸 수 있으면 되고, 목록
 * 자체는 이미 떠 있기 때문이다.
 */

export interface EventCategoryOptions {
  categories: EventCategory[];
  loading: boolean;
  /** 비어 있으면 정상 — 분류 줄에만 조용히 표시한다 */
  errorMessage: string;
}

export function useEventCategoryOptions(): EventCategoryOptions {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let alive = true;

    fetchEventCategories()
      .then((next) => {
        if (alive) setCategories(next);
      })
      .catch((error: unknown) => {
        if (alive) setErrorMessage(toEventCategoryErrorMessage(error));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { categories, loading, errorMessage };
}
