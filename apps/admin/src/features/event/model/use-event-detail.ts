"use client";

import { useCallback, useEffect, useState } from "react";
import { EVENT_ERROR, fetchEvent, type EventDetail } from "@/entities/event";
import { ApiError } from "@/shared/lib/api/client";
import { toEventErrorMessage } from "./event-error";

/*
 * 행사 단건 조회 훅 (#136). 구조의 근거는 features/work/model/use-work-detail.ts와 같다.
 *
 * "없는 행사"를 오류가 아니라 별도 상태로 나눈 것도 같은 이유다 — 오류는 재시도 버튼을
 * 주지만, 없는 행사는 아무리 다시 불러도 없다. 목록으로 돌아갈 길을 준다.
 */

export type EventDetailStatus = "loading" | "ready" | "not-found" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedEventDetail {
  key: string;
  event: EventDetail | null;
  outcome: Exclude<EventDetailStatus, "loading">;
  errorMessage: string;
}

export interface EventDetailQuery {
  event: EventDetail | null;
  status: EventDetailStatus;
  errorMessage: string;
  reload: () => void;
}

export function useEventDetail(eventId: number): EventDetailQuery {
  const [loaded, setLoaded] = useState<LoadedEventDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${eventId}|${reloadKey}`;

  /* URL의 eventId는 사용자가 손으로 고칠 수 있다 — 숫자가 아니면 서버까지 갈 것 없이 끊는다 */
  const isFetchable = Number.isInteger(eventId) && eventId > 0;

  useEffect(() => {
    if (!isFetchable) return;

    let alive = true;

    fetchEvent(eventId)
      .then((next) => {
        if (alive) {
          setLoaded({ key: requestKey, event: next, outcome: "ready", errorMessage: "" });
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;

        const notFound =
          error instanceof ApiError && error.code === EVENT_ERROR.EVENT_NOT_FOUND;

        setLoaded({
          key: requestKey,
          event: null,
          outcome: notFound ? "not-found" : "error",
          errorMessage: notFound ? "" : toEventErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [eventId, isFetchable, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: EventDetailStatus = !isFetchable
    ? "not-found"
    : (current?.outcome ?? "loading");

  return {
    event: status === "ready" ? (current?.event ?? null) : null,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
