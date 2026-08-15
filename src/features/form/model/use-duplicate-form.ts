"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { duplicateForm } from "@/entities/form";
import { syncSessionOnForbidden } from "@/entities/session";
import { toFormDuplicateErrorMessage } from "./form-error";

/*
 * 폼 복제 훅 (ssccops-server #32 · POST /v1/forms/{formId}/duplicate).
 *
 * 사본은 **DRAFT이고 접수 기간이 비어 있으며 라벨을 승계하지 않는다.** 그래서 성공 문구가
 * "DRAFT 폼으로 복제했습니다"뿐이면 라벨이 빠진 것을 아무도 모른 채 접수를 시작하게 된다 —
 * 라벨은 목록 필터의 유일한 분류 축이라 빠지면 그 폼만 어느 묶음에도 안 잡힌다. 문구에 남긴다.
 *
 * 진행 중 잠금과 "토스트를 여기서 띄우지 않는" 이유는 use-form-status.ts 주석과 같다.
 */

export interface FormDuplication {
  /** 성공했을 때 사본의 폼 ID. 실패·중복 클릭이면 null */
  formId: number | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface FormDuplicateControl {
  /** 지금 복제 중인 **원본** 폼 ID — 목록에서 누른 카드만 비활성화한다 */
  pendingFormId: number | null;
  pending: boolean;
  duplicate: (formId: number) => Promise<FormDuplication>;
}

const BUSY: FormDuplication = { formId: null, message: "" };

export function useDuplicateForm(): FormDuplicateControl {
  const [pendingFormId, setPendingFormId] = useState<number | null>(null);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const duplicate = useCallback(async (formId: number): Promise<FormDuplication> => {
    if (inFlightRef.current) return BUSY;
    inFlightRef.current = true;
    setPendingFormId(formId);

    try {
      const copy = await duplicateForm(formId);
      return {
        formId: copy.formId,
        message: "작성 중(DRAFT) 폼으로 복제했습니다 — 라벨과 접수 기간은 승계되지 않습니다",
      };
    } catch (error: unknown) {
      // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
      syncSessionOnForbidden(error);
      return { formId: null, message: toFormDuplicateErrorMessage(error) };
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setPendingFormId(null);
    }
  }, []);

  return { pendingFormId, pending: pendingFormId !== null, duplicate };
}
