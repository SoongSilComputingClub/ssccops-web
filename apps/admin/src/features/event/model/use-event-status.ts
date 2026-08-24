"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  changeEventStatus,
  EVENT_ERROR,
  type EventDetail,
  type EventStatusAction,
} from "@/entities/event";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import { toEventStatusErrorMessage } from "./event-error";

/*
 * 행사 상태 전이 훅 (#136 · POST /v1/events/{eventId}/status).
 *
 * 구조의 근거는 features/form/model/use-form-status.ts와 같다 — 토스트를 여기서 띄우지 않고
 * 결과와 문장을 돌려주며, ref 잠금으로 연타의 두 번째 요청이 나가는 것을 막는다.
 * 전이표 밖(400)은 화면이 낡았다는 뜻(stale)이라 호출한 화면이 다시 불러온다.
 */

export type EventStatusOutcome =
  /** 전이 성공 */
  | "changed"
  /** 화면이 들고 있던 상태가 서버와 어긋났다 — 다시 불러와야 한다 */
  | "stale"
  /** 행사가 없다 (404) — 목록으로 보낸다 */
  | "missing"
  /** 그 밖의 실패 */
  | "failed"
  /** 앞선 요청이 아직 끝나지 않아 아무것도 보내지 않았다 */
  | "busy";

export interface EventStatusChange {
  outcome: EventStatusOutcome;
  /** 사용자에게 보여줄 한 줄 (성공·실패 모두). "busy"면 빈 문자열 */
  message: string;
  /** 성공했을 때의 서버 응답(상세 전체) — 실패면 null */
  event: EventDetail | null;
}

export interface EventStatusControl {
  pending: boolean;
  transition: (eventId: number, action: EventStatusAction) => Promise<EventStatusChange>;
}

const BUSY: EventStatusChange = { outcome: "busy", message: "", event: null };

const SUCCESS_MESSAGE: Record<EventStatusAction, string> = {
  PUBLISH: "행사를 게시했습니다",
  RETRACT: "게시를 철회했습니다 — 작성 중 상태로 돌아갑니다",
  ARCHIVE: "행사를 보관했습니다",
  REPUBLISH: "행사를 다시 게시했습니다",
};

export function useEventStatus(): EventStatusControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const transition = useCallback(
    async (eventId: number, action: EventStatusAction): Promise<EventStatusChange> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPending(true);

      try {
        const event = await changeEventStatus(eventId, action);
        return { outcome: "changed", message: SUCCESS_MESSAGE[action], event };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        const code = error instanceof ApiError ? error.code : "";
        const outcome: EventStatusOutcome =
          code === EVENT_ERROR.INVALID_EVENT_STATUS_TRANSITION
            ? "stale"
            : code === EVENT_ERROR.EVENT_NOT_FOUND
              ? "missing"
              : "failed";
        return { outcome, message: toEventStatusErrorMessage(error), event: null };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  return { pending, transition };
}
