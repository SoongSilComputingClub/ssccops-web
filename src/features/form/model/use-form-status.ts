"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  changeFormStatus,
  FORM_ERROR,
  type FormStatusAction,
  type FormStatusChangeResult,
} from "@/entities/form";
import { ApiError } from "@/shared/lib/api/client";
import { toFormStatusErrorMessage } from "./form-error";

/*
 * 폼 접수 상태 전환 훅 (ssccops-server #33 · POST /v1/forms/{formId}/status).
 *
 * ── 왜 formId를 훅 인자가 아니라 호출 인자로 받는가 ─────────────
 * 이슈 초안은 `useFormStatus(formId)`였지만 그러면 편집 화면의 '저장하고 접수 시작'을 담을 수
 * 없다. 신규 폼은 **저장이 끝나야 formId가 생기고**, 그 값은 클릭 시점에 훅이 아니라 저장
 * 응답에서 온다. 훅이 렌더 시점의 formId를 붙들고 있으면 방금 만든 폼이 아니라 null을 향해
 * 요청하게 된다. 그래서 상태를 갖는 것은 "진행 중인지"뿐이고 대상은 매번 받는다.
 *
 * ── 왜 토스트를 여기서 띄우지 않는가 ────────────────────────────
 * 같은 실패라도 화면마다 할 말이 다르다. 상세에서는 "접수를 시작하지 못했습니다"지만,
 * 편집 화면의 2단계 흐름에서는 **"저장은 됐지만 접수 시작이 실패했습니다"** 여야 한다 —
 * 저장까지 날아간 것으로 오해하면 사용자가 편집을 처음부터 다시 한다. 훅은 결과와 문장을
 * 돌려주고, 어떻게 알릴지는 호출한 화면이 정한다.
 *
 * ── 중복 클릭 ──────────────────────────────────────────────────
 * 버튼 비활성화는 렌더 이후에 걸리므로 연타의 두 번째 클릭은 그보다 먼저 도착할 수 있다.
 * 상태(pendingFormId)와 별도로 ref 잠금을 두어 요청 자체가 두 번 나가지 않게 한다.
 */

export type FormStatusOutcome =
  /** 전이 성공 */
  | "changed"
  /** 화면이 들고 있던 상태가 서버와 어긋났다 — 다시 불러와야 한다 */
  | "stale"
  /** 폼이 없다 (404) — 목록으로 보낸다 */
  | "missing"
  /** 그 밖의 실패 */
  | "failed"
  /** 앞선 요청이 아직 끝나지 않아 아무것도 보내지 않았다 */
  | "busy";

export interface FormStatusChange {
  outcome: FormStatusOutcome;
  /** 사용자에게 보여줄 한 줄 (성공·실패 모두). "busy"면 빈 문자열 */
  message: string;
  /** 성공했을 때의 서버 응답 — 실패면 null */
  result: FormStatusChangeResult | null;
}

export interface FormStatusControl {
  /** 지금 전이 중인 폼 ID. 목록처럼 카드가 여럿인 화면에서 누른 것만 비활성화한다 */
  pendingFormId: number | null;
  pending: boolean;
  open: (formId: number) => Promise<FormStatusChange>;
  close: (formId: number) => Promise<FormStatusChange>;
}

const BUSY: FormStatusChange = { outcome: "busy", message: "", result: null };

/**
 * 성공 문구는 상태 코드가 아니라 **파생 상태(receiptStatus)** 로 고른다.
 *
 * OPEN 전이는 성공해도 지금 응답을 받는다는 뜻이 아니다 — 시작 일시가 아직 오지 않았으면
 * SCHEDULED, 종료 일시가 이미 지났으면 EXPIRED다. 그냥 "접수를 시작했습니다"라고만 하면
 * 운영자는 공개 링크가 열린 줄 알고 그대로 뿌린다.
 */
function toSuccessMessage(action: FormStatusAction, result: FormStatusChangeResult): string {
  if (action === "CLOSE") return "마감했습니다";

  switch (result.receiptStatus) {
    case "SCHEDULED":
      return "접수를 시작했습니다 — 시작 일시 전이라 아직 응답을 받지 않습니다";
    case "EXPIRED":
      return "접수를 시작했지만 종료 일시가 지나 응답을 받지 않습니다. 접수 기간을 확인해주세요";
    default:
      return "접수를 시작했습니다";
  }
}

export function useFormStatus(): FormStatusControl {
  const [pendingFormId, setPendingFormId] = useState<number | null>(null);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const changeStatus = useCallback(
    async (formId: number, action: FormStatusAction): Promise<FormStatusChange> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPendingFormId(formId);

      try {
        const result = await changeFormStatus(formId, action);
        return {
          outcome: "changed",
          message: toSuccessMessage(action, result),
          result,
        };
      } catch (error: unknown) {
        const code = error instanceof ApiError ? error.code : "";
        const outcome: FormStatusOutcome =
          code === FORM_ERROR.INVALID_FORM_STATUS_TRANSITION
            ? "stale"
            : code === FORM_ERROR.FORM_NOT_FOUND
              ? "missing"
              : "failed";
        return { outcome, message: toFormStatusErrorMessage(error), result: null };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPendingFormId(null);
      }
    },
    [],
  );

  const open = useCallback(
    (formId: number) => changeStatus(formId, "OPEN"),
    [changeStatus],
  );
  const close = useCallback(
    (formId: number) => changeStatus(formId, "CLOSE"),
    [changeStatus],
  );

  return { pendingFormId, pending: pendingFormId !== null, open, close };
}
