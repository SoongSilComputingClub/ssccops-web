"use client";

import { create } from "zustand";
import type { RspnsSttsCd } from "@/shared/config/codes";
import { TODAY } from "@/shared/config/constants";
import { nextId } from "@/shared/lib/id";
import seed from "../api/get-form-rspns-hstry.json";
import type { FormRspnsHstry, RspnsCn } from "./types";

interface RspnsState {
  formRspnsHstrys: FormRspnsHstry[];
  setRspnsStts: (formRspnsId: number, rspnsSttsCd: RspnsSttsCd) => void;
  addFormRspns: (
    draft: Omit<FormRspnsHstry, "formRspnsId" | "crtDt" | "mdfcnDt">,
  ) => FormRspnsHstry;
}

export const useRspnsStore = create<RspnsState>((set) => ({
  formRspnsHstrys: seed.data as unknown as FormRspnsHstry[],

  setRspnsStts: (formRspnsId, rspnsSttsCd) =>
    set((s) => ({
      formRspnsHstrys: s.formRspnsHstrys.map((r) =>
        r.formRspnsId === formRspnsId
          ? { ...r, rspnsSttsCd, mdfcnDt: `${TODAY}T10:00:00` }
          : r,
      ),
    })),

  addFormRspns: (draft) => {
    let row: FormRspnsHstry = {
      ...draft,
      formRspnsId: 0,
      crtDt: draft.sbmsnDt,
      mdfcnDt: draft.sbmsnDt,
    };
    set((s) => {
      row = { ...row, formRspnsId: nextId(s.formRspnsHstrys, "formRspnsId") };
      return { formRspnsHstrys: [...s.formRspnsHstrys, row] };
    });
    return row;
  },
}));

/** 응답 상태 배지 표기 */
export const RSPNS_STTS_BADGE: Record<
  RspnsSttsCd,
  { label: string; tone: "blue" | "grey" | "red" }
> = {
  SUBMITTED: { label: "제출", tone: "blue" },
  ACCEPTED: { label: "승인", tone: "blue" },
  REJECTED: { label: "반려", tone: "red" },
};

/** 응답값 표시 문자열 — 다중선택은 ", "로 잇는다 */
export function rspnsValueText(rspnsCn: RspnsCn, qitemId: string): string {
  const v = rspnsCn[qitemId];
  if (v === undefined) return "";
  return Array.isArray(v) ? v.join(", ") : v;
}
