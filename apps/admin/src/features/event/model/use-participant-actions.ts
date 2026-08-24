"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  changeEventParticipantStatus,
  EVENT_PARTICIPANT_ERROR,
  registerEventParticipant,
  type EventParticipantRegisterInput,
  type EventParticipantRegistration,
} from "@/entities/event";
import { syncSessionOnForbidden } from "@/entities/session";
import { PTCP_STTS_NM, type PtcpSttsCd } from "@/shared/config/codes";
import { ApiError } from "@/shared/lib/api/client";
import {
  toEventParticipantRegisterErrorMessage,
  toEventParticipantStatusErrorMessage,
} from "./event-error";

/*
 * 참가자 등록·전이 훅 (#145 · POST · PATCH /v1/events/{eventId}/participants).
 *
 * 구조의 근거는 use-event-status.ts와 같다 — 토스트를 여기서 띄우지 않고 결과와 문장을
 * 돌려주며, ref 잠금으로 연타의 두 번째 요청이 나가는 것을 막는다.
 *
 * **등록과 전이를 한 훅에 둔 것은 잠금을 나눌 이유가 없기 때문이다.** 두 조작 모두 같은
 * 명단을 바꾸고 끝나면 화면이 명단을 다시 부른다 — 잠금이 둘이면 등록이 끝나기 전에 승격이
 * 나가 두 응답이 서로 다른 시점의 확정 인원을 실어 오고, 나중에 도착한 쪽이 화면에 남는다.
 *
 * 성공했는데도 화면이 할 말이 남는 유일한 조작이라 결과에 `registration`을 함께 싣는다 —
 * 정원 초과와 회원 상태 경고는 **막지 않고 알리는 사실**이므로(D5) 실패 경로로 보낼 수 없다.
 */

export type ParticipantActionOutcome =
  /** 등록·전이 성공 (정원 초과·경고가 함께 왔을 수 있다) */
  | "done"
  /** 이미 명단에 있는 회원 (409) */
  | "duplicated"
  /** 화면이 들고 있던 상태가 서버와 어긋났다 — 명단을 다시 불러와야 한다 */
  | "stale"
  /** 그 밖의 실패 */
  | "failed"
  /** 앞선 요청이 아직 끝나지 않아 아무것도 보내지 않았다 */
  | "busy";

export interface ParticipantActionResult {
  outcome: ParticipantActionOutcome;
  /** 사용자에게 보여줄 한 줄 (성공·실패 모두). "busy"면 빈 문자열 */
  message: string;
  /** 성공했을 때의 서버 응답(정원 현황·경고) — 실패면 null */
  registration: EventParticipantRegistration | null;
}

export interface ParticipantActions {
  pending: boolean;
  register: (
    eventId: number,
    input: EventParticipantRegisterInput,
  ) => Promise<ParticipantActionResult>;
  transition: (
    eventId: number,
    eventPtcpId: number,
    ptcpSttsCd: PtcpSttsCd,
  ) => Promise<ParticipantActionResult>;
}

const BUSY: ParticipantActionResult = {
  outcome: "busy",
  message: "",
  registration: null,
};

/**
 * 전이 성공 문구.
 *
 * 코드값이 아니라 무슨 일이 일어났는지를 적는다 — '대기 → 확정'은 승격이고 '확정 → 취소'는
 * 취소다. 계약상 이 둘 말고는 오지 않지만, 맵에 없는 값이 와도 문장이 비지 않게 기본형을 둔다.
 */
function transitionMessage(ptcpSttsCd: PtcpSttsCd): string {
  switch (ptcpSttsCd) {
    case "CONFIRMED":
      return "대기자를 확정으로 올렸습니다";
    case "CANCELLED":
      return "참가를 취소했습니다 — 명단에는 취소로 남습니다";
    default:
      return `참가 상태를 ${PTCP_STTS_NM[ptcpSttsCd]} 상태로 바꿨습니다`;
  }
}

export function useParticipantActions(): ParticipantActions {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /** 두 조작이 같은 잠금·같은 실패 처리를 쓴다 — 다른 것은 요청과 문구뿐이다 */
  const run = useCallback(
    async (
      call: () => Promise<EventParticipantRegistration>,
      successMessage: string,
      toErrorMessage: (error: unknown) => string,
    ): Promise<ParticipantActionResult> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPending(true);

      try {
        const registration = await call();
        return { outcome: "done", message: successMessage, registration };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        const code = error instanceof ApiError ? error.code : "";
        const outcome: ParticipantActionOutcome =
          code === EVENT_PARTICIPANT_ERROR.EVENT_PARTICIPANT_DUPLICATED
            ? "duplicated"
            : code === EVENT_PARTICIPANT_ERROR.INVALID_PARTICIPANT_STATUS_TRANSITION ||
                code === EVENT_PARTICIPANT_ERROR.EVENT_PARTICIPANT_NOT_FOUND
              ? "stale"
              : "failed";
        return { outcome, message: toErrorMessage(error), registration: null };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  const register = useCallback(
    (eventId: number, input: EventParticipantRegisterInput) =>
      run(
        () => registerEventParticipant(eventId, input),
        /* 받침에 따라 조사가 갈리므로(확정으로 · 대기로) 상태명 뒤에 '상태로'를 세운다 */
        `${PTCP_STTS_NM[input.ptcpSttsCd]} 상태로 명단에 올렸습니다`,
        toEventParticipantRegisterErrorMessage,
      ),
    [run],
  );

  const transition = useCallback(
    (eventId: number, eventPtcpId: number, ptcpSttsCd: PtcpSttsCd) =>
      run(
        () => changeEventParticipantStatus(eventId, eventPtcpId, ptcpSttsCd),
        transitionMessage(ptcpSttsCd),
        toEventParticipantStatusErrorMessage,
      ),
    [run],
  );

  return { pending, register, transition };
}
