"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMeeting, MEETING_ERROR, type MeetingAgenda, type MeetingDetail } from "@/entities/meeting";
import { ApiError } from "@/shared/lib/api/client";
import { toMeetingErrorMessage } from "./meeting-error";

/*
 * 회의 단건 조회 훅 (OPS-025). 구조의 근거는 features/work/model/use-work-detail.ts와 같다.
 *
 * "없는 회의"를 오류가 아니라 별도 상태로 나눈 것도 같은 이유다 — 오류는 재시도 버튼을
 * 주지만, 없는 회의는 아무리 다시 불러도 없다. 목록으로 돌아갈 길을 준다.
 *
 * ── 안건 변경은 부분 반영, 상태 전이는 통째로 다시 부른다 ──────────────
 * 안건 상정·수정·철회(OPS-027~029)는 응답이 바뀐 안건 하나뿐이라 그 값만 목록에서 갈아
 * 끼우면 서버와 어긋날 여지가 없다(use-sub-work-detail의 applyChecklistUpdate와 같은 판단).
 * 반대로 상태 전이(OPS-026)는 미처리 안건 집계처럼 다른 값에도 영향을 주므로 reload로
 * 통째로 다시 받는다.
 */

export type MeetingDetailStatus = "loading" | "ready" | "not-found" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedMeetingDetail {
  key: string;
  meeting: MeetingDetail | null;
  outcome: Exclude<MeetingDetailStatus, "loading">;
  errorMessage: string;
}

export interface MeetingDetailQuery {
  meeting: MeetingDetail | null;
  status: MeetingDetailStatus;
  errorMessage: string;
  reload: () => void;
  /** 안건 상정·수정 응답을 화면에 반영한다 (다시 조회하지 않는다) */
  applyAgendaUpsert: (agenda: MeetingAgenda) => void;
  /** 안건 상정 철회 응답을 화면에 반영한다 (다시 조회하지 않는다) */
  applyAgendaRemoval: (agendaId: number) => void;
}

export function useMeetingDetail(meetingId: number): MeetingDetailQuery {
  const [loaded, setLoaded] = useState<LoadedMeetingDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${meetingId}|${reloadKey}`;

  /*
   * URL의 meetingId는 사용자가 손으로 고칠 수 있다. 숫자가 아니면 서버까지 갈 것 없이 없는
   * 회의로 끊는다 — `/v1/meetings/NaN` 같은 요청이 나가는 것을 막는다.
   */
  const isFetchable = Number.isInteger(meetingId) && meetingId > 0;

  useEffect(() => {
    if (!isFetchable) return;

    let alive = true;

    fetchMeeting(meetingId)
      .then((next) => {
        if (alive) {
          setLoaded({ key: requestKey, meeting: next, outcome: "ready", errorMessage: "" });
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;

        const notFound = error instanceof ApiError && error.code === MEETING_ERROR.NOT_FOUND;

        setLoaded({
          key: requestKey,
          meeting: null,
          outcome: notFound ? "not-found" : "error",
          errorMessage: notFound ? "" : toMeetingErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [meetingId, isFetchable, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const applyAgendaUpsert = useCallback((agenda: MeetingAgenda) => {
    setLoaded((current) => {
      if (!current?.meeting) return current;
      const exists = current.meeting.agendas.some((a) => a.agendaId === agenda.agendaId);
      const agendas = exists
        ? current.meeting.agendas.map((a) => (a.agendaId === agenda.agendaId ? agenda : a))
        : [...current.meeting.agendas, agenda];
      return { ...current, meeting: { ...current.meeting, agendas } };
    });
  }, []);

  const applyAgendaRemoval = useCallback((agendaId: number) => {
    setLoaded((current) => {
      if (!current?.meeting) return current;
      return {
        ...current,
        meeting: {
          ...current.meeting,
          agendas: current.meeting.agendas.filter((a) => a.agendaId !== agendaId),
        },
      };
    });
  }, []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: MeetingDetailStatus = !isFetchable
    ? "not-found"
    : (current?.outcome ?? "loading");

  return {
    meeting: status === "ready" ? (current?.meeting ?? null) : null,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    applyAgendaUpsert,
    applyAgendaRemoval,
  };
}
