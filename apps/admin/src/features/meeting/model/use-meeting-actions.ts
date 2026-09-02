"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncSessionOnForbidden } from "@/entities/session";
import {
  addMeetingAgenda,
  deleteMeeting,
  transitionMeeting,
  updateMeetingAgenda,
  withdrawMeetingAgenda,
  type MeetingAgenda,
  type MeetingAgendaInput,
  type MeetingAgendaUpdateInput,
  type MeetingTransition,
  type MeetingTransitionResult,
} from "@/entities/meeting";
import { toMeetingActionErrorMessage, toMeetingDeleteErrorMessage } from "./meeting-error";

/*
 * 회의 상세 화면의 수정 훅 (OPS-026 전이 · OPS-027 상정 · OPS-028 수정 · OPS-029 철회, #83).
 *
 * 넷을 한 훅에 둔 것은 하나의 진행 중 잠금을 나눠 쓰기 위해서다(use-sub-work-actions와 같은
 * 이유) — 안건을 상정하는 동안 전이를 누르면 서버가 방금 상정한 안건을 반영하지 못한
 * 판정(예: 미처리 안건 집계)을 내릴 수 있다.
 *
 * 토스트를 여기서 띄우지 않고 결과 문구를 돌려준다 — 성공 뒤에 화면을 어떻게 할지는 뷰가
 * 정한다(등록 훅 use-create-meeting과 같은 규칙).
 */

export interface MeetingActionOutcome<T> {
  /** 성공했을 때의 서버 응답. 실패·중복 클릭이면 null */
  result: T | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface MeetingActionControl {
  pending: boolean;
  transition: (
    action: MeetingTransition,
    reason?: string | null,
  ) => Promise<MeetingActionOutcome<MeetingTransitionResult>>;
  addAgenda: (input: MeetingAgendaInput) => Promise<MeetingActionOutcome<MeetingAgenda>>;
  updateAgenda: (
    agendaId: number,
    input: MeetingAgendaUpdateInput,
  ) => Promise<MeetingActionOutcome<MeetingAgenda>>;
  withdrawAgenda: (agendaId: number) => Promise<MeetingActionOutcome<true>>;
  remove: () => Promise<MeetingActionOutcome<true>>;
}

const BUSY = { result: null, message: "" } as const;

/** 전이 성공 문구 — 액션마다 다음에 무엇이 일어났는지를 말해 준다 */
const DONE_MESSAGE: Record<MeetingTransition, string> = {
  OPEN: "회의를 개회했습니다",
  WRITE_MINUTES: "회의록 작성 상태로 바꿨습니다",
  CLOSE: "회의를 종료했습니다",
  CANCEL: "회의를 취소했습니다",
};

export function useMeetingActions(meetingId: number): MeetingActionControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(
    async <T,>(
      send: () => Promise<T>,
      doneMessage: string,
      toErrorMessage: (error: unknown) => string = toMeetingActionErrorMessage,
    ): Promise<MeetingActionOutcome<T>> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPending(true);

      try {
        return { result: await send(), message: doneMessage };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return { result: null, message: toErrorMessage(error) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  const transition = useCallback(
    (action: MeetingTransition, reason: string | null = null) => {
      // 취소 사유 선검사. 서버도 막지만(422 REASON_REQUIRED) 왕복 한 번을 기다릴 이유가 없다
      if (action === "CANCEL" && !(reason?.trim() ?? "")) {
        return Promise.resolve({ result: null, message: "취소 사유를 입력해주세요" });
      }
      return run(() => transitionMeeting(meetingId, action, reason), DONE_MESSAGE[action]);
    },
    [run, meetingId],
  );

  const addAgenda = useCallback(
    (input: MeetingAgendaInput) =>
      run(() => addMeetingAgenda(meetingId, input), "안건을 추가했습니다"),
    [run, meetingId],
  );

  const updateAgenda = useCallback(
    (agendaId: number, input: MeetingAgendaUpdateInput) =>
      run(
        () => updateMeetingAgenda(meetingId, agendaId, input),
        /*
         * 처리 구분 칩·본문 입력마다 토스트를 띄우지 않는다 — 값이 즉시 바뀌는 것 자체가
         * 결과다(use-sub-work-actions의 체크리스트 갱신과 같은 판단). 실패했을 때만 문구가
         * 필요하고, 그쪽은 catch가 만든다.
         */
        "",
      ),
    [run, meetingId],
  );

  const withdrawAgenda = useCallback(
    (agendaId: number) =>
      run(async () => {
        await withdrawMeetingAgenda(meetingId, agendaId);
        return true as const;
      }, "안건을 삭제했습니다"),
    [run, meetingId],
  );

  /*
   * 회의 삭제 (서버 #125). 안건 철회(withdrawAgenda)와 같은 잠금을 쓰지만 오류 문구는 다르다 —
   * 삭제 403은 "책임자만"이 아니라 "MEETING_DELETE 권한 없음"이라 toMeetingDeleteErrorMessage를
   * 따로 넘긴다.
   */
  const remove = useCallback(
    () =>
      run(
        async () => {
          await deleteMeeting(meetingId);
          return true as const;
        },
        "회의를 삭제했습니다",
        toMeetingDeleteErrorMessage,
      ),
    [run, meetingId],
  );

  return { pending, transition, addAgenda, updateAgenda, withdrawAgenda, remove };
}
