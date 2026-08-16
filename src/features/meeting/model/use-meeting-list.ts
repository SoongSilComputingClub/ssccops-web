"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMeetings, type MeetingListItem } from "@/entities/meeting";
import { toMeetingErrorMessage } from "./meeting-error";

/*
 * 회의 목록 조회 훅 (OPS-031).
 *
 * 페칭 방식(SWR·React Query를 넣지 않는 이유)과 "결과에 요청 식별자를 실어 로딩을
 * 파생시키는" 구조의 근거는 features/form/model/use-form-list.ts 주석 참고.
 *
 * 업무 목록(use-work-list)과 달리 커서 페이징이 없다 — 서버가 page 봉투를 싣지 않고
 * 전량을 한 번에 내린다(entities/meeting/api/meetings.ts 주석). 그래서 loadMore가 없다.
 */

export type MeetingListStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedMeetingList {
  key: string;
  meetings: MeetingListItem[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface MeetingList {
  meetings: MeetingListItem[];
  status: MeetingListStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

export function useMeetingList(): MeetingList {
  const [loaded, setLoaded] = useState<LoadedMeetingList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = String(reloadKey);

  useEffect(() => {
    let alive = true;

    fetchMeetings()
      .then((meetings) => {
        if (!alive) return;
        setLoaded({ key: requestKey, meetings, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded({ key: requestKey, meetings: [], errorMessage: toMeetingErrorMessage(error) });
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // 이번 요청의 결과가 아직 없으면(최초 진입이든 재시도 직후든) 로딩이다
  const current = loaded?.key === requestKey ? loaded : null;
  const status: MeetingListStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    meetings: current?.meetings ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
