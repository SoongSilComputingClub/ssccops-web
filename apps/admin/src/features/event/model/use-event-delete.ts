"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteEvent, EVENT_ERROR, restoreEvent } from "@/entities/event";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import { toEventDeleteErrorMessage, toEventRestoreErrorMessage } from "./event-error";

/*
 * 행사 삭제·복구 훅 (ssccops-web#391 · ADR-0020 · 서버 ssccops-server#347).
 *
 * 구조의 근거는 features/form/model/use-form-delete.ts와 같다 — 삭제와 복구가 한 훅인 것은
 * 둘이 같은 결정의 앞뒤라서고(**되돌릴 수 있다는 것이 참가자 있는 행사를 지운다는 결정을 감당
 * 가능하게 만드는 유일한 조건**이다), 토스트를 여기서 띄우지 않는 것은 화면마다 성공 후 갱신이
 * 달라서다(목록은 다시 부르고, 휴지통은 그 카드를 뺀다). ref 잠금으로 연타의 두 번째 요청이
 * 나가지 않게 한다 — 삭제 두 번은 두 번째가 409로 튕겨 방금 지운 사람에게 오류를 보여준다.
 *
 * ── 폼과 다른 한 가지: `blocked` ───────────────────────────────
 * 학술 활동이 딸린 행사는 서버가 409로 거절하고(ADR-0020 — `acdm_actv.event_id`가 NOT NULL이라
 * 행사가 사라지면 프로그램이 고아가 된다), 화면은 목록만으로 그것을 미리 알 수 없어 잠글 수도
 * 없다. 그래서 이 거절은 "실패"가 아니라 **이 행사에 관한 사실**이고, 토스트로 날리면 왜
 * 안 되는지 다시 볼 수 없다. 화면이 확인 시트를 닫지 않고 그 안에 사유를 남길 수 있게 결과를
 * 따로 가른다.
 */

export type EventDeleteOutcome =
  /** 지웠다 · 되살렸다 */
  | "done"
  /**
   * 서버가 이 행사를 지울 수 없다고 판정했다(학술 활동이 딸려 있다).
   *
   * 화면은 확인 시트를 닫지 않고 `message`를 그 안에 남긴다. 목록도 다시 부르지 않는다 —
   * 화면이 낡은 것이 아니라 행사의 상태가 그렇다.
   */
  | "blocked"
  /**
   * 화면이 낡았다 — 다른 탭에서 이미 지웠거나(409) 되살렸거나(409) 대상이 사라졌다(404).
   *
   * 실패로 다루지 않고 목록을 다시 부른다. 사용자가 원한 상태와 서버의 상태가 이미 같아서,
   * 여기서 할 일은 사과가 아니라 최신 목록을 보여주는 것이다(use-event-status의 "stale"과 같다).
   */
  | "stale"
  /** 그 밖의 실패 */
  | "failed"
  /** 앞선 요청이 아직 끝나지 않아 아무것도 보내지 않았다 */
  | "busy";

export interface EventDeleteChange {
  outcome: EventDeleteOutcome;
  /** 사용자에게 보여줄 한 줄 (성공·실패 모두). "busy"면 빈 문자열 */
  message: string;
}

export interface EventDeleteControl {
  /** 지금 지우거나 되살리는 중인 행사 ID — 목록에서 누른 카드만 비활성화한다 */
  pendingEventId: number | null;
  pending: boolean;
  remove: (eventId: number) => Promise<EventDeleteChange>;
  restore: (eventId: number) => Promise<EventDeleteChange>;
}

const BUSY: EventDeleteChange = { outcome: "busy", message: "" };

/**
 * 성공 문구는 **다음에 갈 자리를 이름으로 짚는다.**
 *
 * "행사를 지웠습니다."로 끝내면 되살릴 수 있다는 사실이 화면 어디에도 남지 않는다 — 확인 시트는
 * 이미 닫혔고, 목록에서 그 행사는 사라진 뒤다. 소프트 삭제가 하드 삭제와 다르다는 것을 사용자가
 * 아는 마지막 자리가 이 한 줄이다(폼과 같은 판단).
 */
const DELETED_MESSAGE = "행사를 지웠습니다 — '지운 행사'에서 되살릴 수 있습니다";
const RESTORED_MESSAGE = "행사를 되살렸습니다 — 행사 목록에서 볼 수 있습니다";

export function useEventDelete(): EventDeleteControl {
  const [pendingEventId, setPendingEventId] = useState<number | null>(null);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(
    async (
      eventId: number,
      call: (eventId: number) => Promise<void>,
      doneMessage: string,
      toMessage: (error: unknown) => string,
      /** 이 코드가 오면 화면이 낡은 것이다 — 삭제는 ALREADY_DELETED, 복구는 NOT_DELETED */
      staleCode: string,
    ): Promise<EventDeleteChange> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPendingEventId(eventId);

      try {
        await call(eventId);
        return { outcome: "done", message: doneMessage };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        const code = error instanceof ApiError ? error.code : "";
        const outcome: EventDeleteOutcome =
          code === EVENT_ERROR.EVENT_HAS_ACADEMIC_PROGRAM
            ? "blocked"
            : code === staleCode || code === EVENT_ERROR.EVENT_NOT_FOUND
              ? "stale"
              : "failed";
        return { outcome, message: toMessage(error) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPendingEventId(null);
      }
    },
    [],
  );

  const remove = useCallback(
    (eventId: number) =>
      run(
        eventId,
        deleteEvent,
        DELETED_MESSAGE,
        toEventDeleteErrorMessage,
        EVENT_ERROR.EVENT_ALREADY_DELETED,
      ),
    [run],
  );

  const restore = useCallback(
    (eventId: number) =>
      run(
        eventId,
        restoreEvent,
        RESTORED_MESSAGE,
        toEventRestoreErrorMessage,
        EVENT_ERROR.EVENT_NOT_DELETED,
      ),
    [run],
  );

  return { pendingEventId, pending: pendingEventId !== null, remove, restore };
}
