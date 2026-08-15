"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncSessionOnForbidden } from "@/entities/session";
import { createMeeting, type MeetingCreateInput } from "@/entities/meeting";
import { toMeetingCreateErrorMessage } from "./meeting-error";

/*
 * 회의 등록 훅 (OPS-024 · POST /v1/meetings). 구조는 features/work의 use-create-work와 같다.
 *
 * 진행 중 잠금(inFlightRef)이 필요한 이유도 같다: 연타하면 같은 내용의 회의가 여러 건
 * 만들어진다 — 서버에 중복을 막을 유니크 제약이 없고, 되돌리는 API도 아직 없다.
 */

export interface MeetingCreation {
  /** 성공했을 때 등록된 회의 ID. 실패·중복 클릭이면 null */
  meetingId: number | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface MeetingCreateControl {
  pending: boolean;
  create: (input: MeetingCreateInput) => Promise<MeetingCreation>;
}

const BUSY: MeetingCreation = { meetingId: null, message: "" };

export function useCreateMeeting(): MeetingCreateControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const create = useCallback(async (input: MeetingCreateInput): Promise<MeetingCreation> => {
    if (inFlightRef.current) return BUSY;
    inFlightRef.current = true;
    setPending(true);

    try {
      const created = await createMeeting(input);
      return { meetingId: created.meetingId, message: "회의를 등록했습니다" };
    } catch (error: unknown) {
      // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
      syncSessionOnForbidden(error);
      return { meetingId: null, message: toMeetingCreateErrorMessage(error) };
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setPending(false);
    }
  }, []);

  return { pending, create };
}
