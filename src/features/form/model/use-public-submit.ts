"use client";

import { type Form } from "@/entities/form";
import { useRspnsStore, type RspnsCn } from "@/entities/response";
import { TODAY } from "@/shared/config/constants";

/**
 * 공개 폼 제출 — 비회원 응답 저장.
 * 비회원의 식별 정보(성명·학번·학과·연락처)는 별도 컬럼이 아니라
 * 문항 응답(rspnsCn) 안에 그대로 담긴다.
 */
export function usePublicSubmit() {
  const addFormRspns = useRspnsStore((s) => s.addFormRspns);

  return (form: Form, answers: RspnsCn) => {
    const rspnsCn: RspnsCn = {};
    for (const [qitemId, v] of Object.entries(answers)) {
      if (Array.isArray(v) ? v.length : v) rspnsCn[qitemId] = v;
    }

    addFormRspns({
      formId: form.formId,
      mbrId: null,
      rspnsSttsCd: "SUBMITTED",
      rspnsCn,
      sbmsnDt: `${TODAY}T12:00:00`,
    });
  };
}
