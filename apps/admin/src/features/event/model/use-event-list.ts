"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchEvents, type EventListFilter, type EventSummary } from "@/entities/event";
import { toEventErrorMessage } from "./event-error";

/*
 * 행사 목록 조회 훅 (#136).
 *
 * 구조의 근거는 features/form/model/use-form-list.ts와 같다 — apiFetch + useEffect로 가고,
 * 조회 결과에 요청 식별자(key)를 함께 담아 로딩을 파생시킨다. 늦게 도착한 이전 필터의 응답이
 * 최신 목록을 덮어쓰지 못하고, 이펙트 본문에서 로딩 setState를 부르지 않는다.
 */

export type EventListStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedEventList {
  key: string;
  events: EventSummary[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface EventList {
  events: EventSummary[];
  status: EventListStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

export function useEventList(filter: EventListFilter = {}): EventList {
  const { eventClsfCd = null, eventSttsCd = null } = filter;
  const [loaded, setLoaded] = useState<LoadedEventList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${eventClsfCd ?? ""}|${eventSttsCd ?? ""}|${reloadKey}`;

  /* 의존성은 필터 객체가 아니라 원시값이다 — 인라인 객체를 의존성에 두면 무한 재조회가 된다 */
  useEffect(() => {
    let alive = true;

    fetchEvents({ eventClsfCd, eventSttsCd })
      .then((next) => {
        if (alive) setLoaded({ key: requestKey, events: next, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({ key: requestKey, events: [], errorMessage: toEventErrorMessage(error) });
        }
      });

    return () => {
      alive = false;
    };
  }, [eventClsfCd, eventSttsCd, requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: EventListStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    events: current?.events ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
