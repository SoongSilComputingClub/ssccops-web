"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createEvent,
  updateEvent,
  type EventDetail,
  type EventSaveInput,
} from "@/entities/event";
import { syncSessionOnForbidden } from "@/entities/session";
import { toEventSaveErrorMessage } from "./event-error";

/*
 * 행사 저장 훅 (#136 · POST /v1/events · PUT /v1/events/{eventId}).
 *
 * 구조는 features/work의 use-update-work와 같다 — 토스트를 여기서 띄우지 않고 결과 문구를
 * 돌려주며, 성공했을 때 화면을 어디로 옮길지는 뷰가 정한다. 생성과 수정이 같은 본문을 쓰므로
 * (계약이 그렇다) 한 훅이 두 진입을 함께 든다 — 오류 표면도 같다.
 *
 * 진행 중 잠금(inFlightRef)은 연타로 같은 요청이 겹쳐 나가는 것을 막는다 — 생성은 멱등하지
 * 않아 연타가 곧 행사 두 건이다.
 */

export interface EventSave {
  /** 성공했을 때 저장된 행사 상세. 실패·중복 클릭이면 null */
  event: EventDetail | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface EventSaveControl {
  pending: boolean;
  create: (input: EventSaveInput) => Promise<EventSave>;
  update: (eventId: number, input: EventSaveInput) => Promise<EventSave>;
}

const BUSY: EventSave = { event: null, message: "" };

export function useSaveEvent(): EventSaveControl {
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
    async (action: () => Promise<EventDetail>, successMessage: string): Promise<EventSave> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPending(true);

      try {
        const event = await action();
        return { event, message: successMessage };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return { event: null, message: toEventSaveErrorMessage(error) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  const create = useCallback(
    (input: EventSaveInput) =>
      // 생성은 항상 작성 중(DRAFT)이다(D9) — 게시가 따로 남았음을 문구가 함께 말한다
      run(() => createEvent(input), "행사를 등록했습니다 — 게시 전에는 화면에 공개되지 않습니다"),
    [run],
  );

  const update = useCallback(
    (eventId: number, input: EventSaveInput) =>
      run(() => updateEvent(eventId, input), "행사 정보를 수정했습니다"),
    [run],
  );

  return { pending, create, update };
}
