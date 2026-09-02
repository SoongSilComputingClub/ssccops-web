"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchEventParticipants, type EventParticipant } from "@/entities/event";
import type { PtcpSttsCd } from "@/shared/config/codes";
import { toEventParticipantErrorMessage } from "./event-error";

/*
 * 참가자 명단 조회 훅 (#145 · GET /v1/events/{eventId}/participants).
 *
 * 구조는 features/response/model/use-response-list.ts와 같다 — 상태 필터는 화면에서
 * filter()로 거르지 않고 서버 쿼리로 나간다. 그래서 필터가 바뀌면 재조회가 필요하고, 그
 * 사이의 화면은 "이전 필터의 명단"이 아니라 로딩이어야 한다.
 *
 * **서버가 준 순서를 그대로 쥔다.** 명단은 등록순으로 오고, 화면의 '순번'은 그 순서를 세는
 * 것뿐이다(D5 — 운영 화면에만 신청 순서를 참고용으로 보인다). 여기서 다시 정렬하면 그
 * 순번이 서버가 아는 순서와 갈린다.
 */

export type EventParticipantsStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedParticipants {
  key: string;
  participants: EventParticipant[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface EventParticipants {
  participants: EventParticipant[];
  status: EventParticipantsStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

export function useEventParticipants(
  eventId: number,
  ptcpSttsCd: PtcpSttsCd | null = null,
): EventParticipants {
  const [loaded, setLoaded] = useState<LoadedParticipants | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${eventId}|${ptcpSttsCd ?? ""}|${reloadKey}`;

  useEffect(() => {
    let alive = true;

    fetchEventParticipants(eventId, ptcpSttsCd)
      .then((next) => {
        if (alive) setLoaded({ key: requestKey, participants: next, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            participants: [],
            errorMessage: toEventParticipantErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [eventId, ptcpSttsCd, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: EventParticipantsStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    participants: current?.participants ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
