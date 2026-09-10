"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteForm, FORM_ERROR, restoreForm } from "@/entities/form";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import { toFormDeleteErrorMessage, toFormRestoreErrorMessage } from "./form-error";

/*
 * 폼 삭제·복구 훅 (ssccops-server#329 · PR #330으로 확정).
 *
 * ── 왜 삭제와 복구가 한 훅인가 ──────────────────────────────────
 * 두 화면에 따로 두면 잠금·오류 처리·성공 후 갱신이 두 벌이 된다. 그런데 이 둘은 같은 결정의
 * 앞뒤다 — **되돌릴 수 있다는 것이 응답 있는 폼을 지운다는 결정을 감당 가능하게 만드는 유일한
 * 조건**이다(ssccops#261 결정 코멘트). 한 훅에 두면 한쪽만 고치는 일이 생기지 않는다.
 *
 * ── 왜 토스트를 여기서 띄우지 않는가 ────────────────────────────
 * use-form-status.ts와 같은 판단이다. 같은 실패라도 화면마다 할 말이 다르고(목록에서 지웠을
 * 때와 상세에서 지웠을 때 다음에 갈 곳이 다르다), 성공 후 갱신도 다르다 — 목록은 다시 부르고
 * 상세는 목록으로 나간다. 훅은 결과와 문장을 돌려주고 처리는 화면이 정한다.
 *
 * ── 중복 클릭 ──────────────────────────────────────────────────
 * 버튼 비활성화는 렌더 이후에 걸리므로 연타의 두 번째 클릭이 먼저 도착할 수 있다. ref 잠금으로
 * 요청 자체가 두 번 나가지 않게 한다 — 여기서는 대가가 특히 크다. 삭제 두 번은 두 번째가
 * 409로 튕겨 **방금 지운 사람에게 오류를 보여준다.**
 */

export type FormDeleteOutcome =
  /** 지웠다 · 되살렸다 */
  | "done"
  /**
   * 화면이 낡았다 — 다른 탭에서 이미 지웠거나(409) 대상이 사라졌다(404).
   *
   * 실패로 다루지 않고 목록을 다시 부른다. 사용자가 원한 상태와 서버의 상태가 이미 같아서,
   * 여기서 할 일은 사과가 아니라 최신 목록을 보여주는 것이다(use-form-status의 "stale"과 같다).
   */
  | "stale"
  /** 그 밖의 실패 */
  | "failed"
  /** 앞선 요청이 아직 끝나지 않아 아무것도 보내지 않았다 */
  | "busy";

export interface FormDeleteChange {
  outcome: FormDeleteOutcome;
  /** 사용자에게 보여줄 한 줄 (성공·실패 모두). "busy"면 빈 문자열 */
  message: string;
}

export interface FormDeleteControl {
  /** 지금 지우거나 되살리는 중인 폼 ID — 목록에서 누른 카드만 비활성화한다 */
  pendingFormId: number | null;
  pending: boolean;
  remove: (formId: number) => Promise<FormDeleteChange>;
  restore: (formId: number) => Promise<FormDeleteChange>;
}

const BUSY: FormDeleteChange = { outcome: "busy", message: "" };

/**
 * 성공 문구는 **다음에 갈 자리를 이름으로 짚는다.**
 *
 * "폼을 지웠습니다."로 끝내면 되살릴 수 있다는 사실이 화면 어디에도 남지 않는다 — 확인 시트는
 * 이미 닫혔고, 목록에서 그 폼은 사라진 뒤다. 소프트 삭제가 하드 삭제와 다르다는 것을 사용자가
 * 아는 마지막 자리가 이 한 줄이다.
 */
const DELETED_MESSAGE = "폼을 지웠습니다 — '지운 폼'에서 되살릴 수 있습니다";
const RESTORED_MESSAGE = "폼을 되살렸습니다 — 폼 목록에서 볼 수 있습니다";

export function useFormDelete(): FormDeleteControl {
  const [pendingFormId, setPendingFormId] = useState<number | null>(null);
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
      formId: number,
      call: (formId: number) => Promise<void>,
      doneMessage: string,
      toMessage: (error: unknown) => string,
      staleCode: string,
    ): Promise<FormDeleteChange> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPendingFormId(formId);

      try {
        await call(formId);
        return { outcome: "done", message: doneMessage };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        const code = error instanceof ApiError ? error.code : "";
        const outcome: FormDeleteOutcome =
          code === staleCode || code === FORM_ERROR.FORM_NOT_FOUND ? "stale" : "failed";
        return { outcome, message: toMessage(error) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPendingFormId(null);
      }
    },
    [],
  );

  const remove = useCallback(
    (formId: number) =>
      run(
        formId,
        deleteForm,
        DELETED_MESSAGE,
        toFormDeleteErrorMessage,
        FORM_ERROR.FORM_ALREADY_DELETED,
      ),
    [run],
  );

  const restore = useCallback(
    (formId: number) =>
      run(
        formId,
        restoreForm,
        RESTORED_MESSAGE,
        toFormRestoreErrorMessage,
        FORM_ERROR.FORM_NOT_DELETED,
      ),
    [run],
  );

  return { pendingFormId, pending: pendingFormId !== null, remove, restore };
}
