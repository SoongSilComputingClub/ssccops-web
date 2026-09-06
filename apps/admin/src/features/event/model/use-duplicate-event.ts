"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { duplicateEvent, type EventDuplicate } from "@/entities/event";
import { syncSessionOnForbidden } from "@/entities/session";
import { toEventDuplicateErrorMessage } from "./event-error";

/*
 * 행사 복제 훅 (ssccops#198 · POST /v1/events/{eventId}/duplicate).
 *
 * 모양은 useDeleteEvent와 같다 — 중복 클릭 차단(inFlightRef) · 언마운트 뒤 setState 방지 ·
 * 403이면 세션 재동기화. 다른 것은 성공했을 때 **사본을 돌려준다**는 점이다: 화면이 그
 * eventId로 수정 화면에 가야 하므로 "성공했다"만으로는 부족하다.
 *
 * **승계/초기화를 여기서 손대지 않는다.** 서버가 정하는 규칙이고, 무엇보다 폼 사본 생성과
 * 본문 이미지 복사는 웹이 할 수 있는 일이 아니다 — 훅은 부르고 결과를 옮길 뿐이다.
 */

export interface EventDuplicateResult {
  /** 성공하면 사본. 실패했거나 중복 클릭으로 아무것도 보내지 않았으면 null */
  duplicate: EventDuplicate | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭이면 빈 문자열 */
  message: string;
}

export interface EventDuplicateControl {
  pending: boolean;
  duplicate: (eventId: number) => Promise<EventDuplicateResult>;
}

const BUSY: EventDuplicateResult = { duplicate: null, message: "" };

export function useDuplicateEvent(): EventDuplicateControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(async (eventId: number): Promise<EventDuplicateResult> => {
    if (inFlightRef.current) return BUSY;
    inFlightRef.current = true;
    setPending(true);

    try {
      const copy = await duplicateEvent(eventId);
      /*
       * 신청서 사본이 함께 생겼다는 것을 결과 문구에 담는다 — 폼 목록에 (복사본)이 하나
       * 늘어나는 것은 사용자가 화면에서 보지 못한 채 일어나는 변화다.
       */
      return {
        duplicate: copy,
        message:
          copy.formId === null
            ? "행사를 복제했습니다"
            : "행사와 신청서를 함께 복제했습니다",
      };
    } catch (error: unknown) {
      // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
      syncSessionOnForbidden(error);
      return { duplicate: null, message: toEventDuplicateErrorMessage(error) };
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setPending(false);
    }
  }, []);

  return { pending, duplicate: run };
}
