"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  designateSystemForm,
  FORM_ERROR,
  RECRUIT_SYS_FORM_CD,
  type SystemFormDesignateResult,
} from "@/entities/form";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import { toSystemFormDesignateErrorMessage } from "./form-error";

/*
 * 신입회원 모집 폼 지정 훅 (#588 · ssccops#436 · ADR-0044 · PUT /v1/forms/system/RECRUIT).
 *
 * 코드를 인자로 받지 않고 `RECRUIT`로 고정한다 — 서버 허용 목록이 그 하나뿐이고(기획안은 시드가
 * 세우고 옮기지 않는다), 화면에 «어느 코드로 지정할지» 고르는 자리를 두면 400을 받을 선택지를
 * 사용자에게 내미는 것이 된다. 코드가 늘면 그때 인자로 연다.
 *
 * 진행 중 잠금(ref)과 «토스트를 여기서 띄우지 않는» 이유는 use-form-status.ts 주석과 같다.
 * 결과의 `missing`(404)은 접수 상태 전이와 같은 뜻 — 화면이 목록으로 나간다.
 */

export type SystemFormDesignateOutcome =
  /** 지정됐다 — 화면은 상세를 다시 부른다 */
  | "designated"
  /** 폼이 없다 (404) — 목록으로 보낸다 */
  | "missing"
  /** 그 밖의 실패 */
  | "failed"
  /** 앞선 요청이 아직 끝나지 않아 아무것도 보내지 않았다 */
  | "busy";

export interface SystemFormDesignation {
  outcome: SystemFormDesignateOutcome;
  /** 사용자에게 보여줄 한 줄. "busy"면 빈 문자열 */
  message: string;
  result: SystemFormDesignateResult | null;
}

export interface SystemFormDesignateControl {
  pending: boolean;
  designateRecruit: (formId: number) => Promise<SystemFormDesignation>;
}

const BUSY: SystemFormDesignation = { outcome: "busy", message: "", result: null };

/**
 * 성공 문구 — **이전 지정 폼이 풀렸으면 그 사실을 함께 말한다.**
 *
 * 지정은 포인터 이동이라 성공 화면에는 새 폼만 보이고 지난 학기 폼에 무슨 일이 났는지는 어디에도
 * 없다(ADR-0044 «포기하는 것» — 지정이 풀린 폼은 삭제 잠금이 사라진 일반 폼이 된다). 첫 지정
 * (`prevFormId` null)과 같은 폼 재지정은 풀린 것이 없어 짧게 끝난다.
 */
function toSuccessMessage(formId: number, result: SystemFormDesignateResult): string {
  const prev = result.prevFormId;
  if (prev === null || prev === formId) return "신입회원 모집 폼으로 지정했습니다";
  return `신입회원 모집 폼으로 지정했습니다 — 폼 #${prev}의 지정은 풀렸습니다`;
}

export function useDesignateSystemForm(): SystemFormDesignateControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const designateRecruit = useCallback(
    async (formId: number): Promise<SystemFormDesignation> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPending(true);

      try {
        const result = await designateSystemForm(RECRUIT_SYS_FORM_CD, formId);
        return { outcome: "designated", message: toSuccessMessage(formId, result), result };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        const code = error instanceof ApiError ? error.code : "";
        return {
          outcome: code === FORM_ERROR.FORM_NOT_FOUND ? "missing" : "failed",
          message: toSystemFormDesignateErrorMessage(error),
          result: null,
        };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  return { pending, designateRecruit };
}
