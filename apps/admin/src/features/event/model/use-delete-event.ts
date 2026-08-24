"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteEvent } from "@/entities/event";
import { syncSessionOnForbidden } from "@/entities/session";
import { toEventDeleteErrorMessage } from "./event-error";

/*
 * 행사 삭제 훅 (#136 · DELETE /v1/events/{eventId}).
 *
 * 참가자가 있으면 서버가 409 EVENT_HAS_PARTICIPANT로 거절한다 — 화면이 확정 수로 먼저 잠그지
 * 않는 이유는 entities/event/api/events.ts의 deleteEvent 주석 참고. 문구는 event-error가 맡는다.
 */

export interface EventDelete {
  /** 성공하면 true — 화면은 이때만 목록으로 이동한다 */
  deleted: boolean;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface EventDeleteControl {
  pending: boolean;
  remove: (eventId: number) => Promise<EventDelete>;
}

const BUSY: EventDelete = { deleted: false, message: "" };

export function useDeleteEvent(): EventDeleteControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const remove = useCallback(async (eventId: number): Promise<EventDelete> => {
    if (inFlightRef.current) return BUSY;
    inFlightRef.current = true;
    setPending(true);

    try {
      await deleteEvent(eventId);
      return { deleted: true, message: "행사를 삭제했습니다" };
    } catch (error: unknown) {
      // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
      syncSessionOnForbidden(error);
      return { deleted: false, message: toEventDeleteErrorMessage(error) };
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setPending(false);
    }
  }, []);

  return { pending, remove };
}
