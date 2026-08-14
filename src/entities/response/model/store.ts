"use client";

import { create } from "zustand";
import type { RspnsSttsCd } from "@/shared/config/codes";
import { TODAY } from "@/shared/config/constants";
import { nextId } from "@/shared/lib/id";
import seed from "../api/get-form-rspns-hstry.json";
import type { FormRspnsHstry } from "./types";

/*
 * 공개 폼 제출(#12) 목 경로만 남은 스토어다. 응답 목록·상세·상태 변경은 서버 API
 * (api/responses.ts)로 옮겼으므로 더 이상 이 스토어를 읽지 않는다.
 */

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
