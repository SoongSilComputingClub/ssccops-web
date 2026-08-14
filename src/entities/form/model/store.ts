"use client";

import { create } from "zustand";
import type { FormSttsCd } from "@/shared/config/codes";
import { TODAY } from "@/shared/config/constants";
import { nextId } from "@/shared/lib/id";
import formSeed from "../api/get-form.json";
import type { Form } from "./types";

interface FormState {
  forms: Form[];

  updateForm: (formId: number, patch: Partial<Form>) => void;
  duplicateForm: (formId: number) => Form | null;
}

/*
 * `saveForm`·`setFormLbls`는 지웠다. 폼 편집기가 서버(POST·PUT /v1/forms)로 저장하게 됐고,
 * 라벨 지정도 그 본문의 labelIds로 함께 나간다(#8 · #10 합의). 목 구현을 남겨 두면 서버로
 * 저장한 뒤에도 화면이 메모리 배열을 고치는 경로가 되살아나, 새로고침하면 사라지는 저장이
 * 다시 생긴다.
 *
 * 라벨(`formLbls`·`formLblRels`·`addFormLbl`·`toggleFormLbl`·`formLblsOf`)도 같은 이유로
 * 지웠다(#10). 목록·추가·사용_여부는 이제 `/v1/form-labels`가, 폼별 지정은 폼 저장 본문이
 * 담당한다. 특히 "사용 중인 폼 N건"을 세던 `formLblRels`는 이 브라우저가 들고 있던 목 배열일
 * 뿐이라 실제 지정 수와 무관했다 — 서버 집계(`usageCount`)로 대체됐다.
 * 남은 목(duplicateForm)은 #9에서 서버로 옮긴다.
 */

const NOW = `${TODAY}T10:00:00`;

export const useFormStore = create<FormState>((set) => ({
  forms: formSeed.data as unknown as Form[],

  updateForm: (formId, patch) =>
    set((s) => ({
      forms: s.forms.map((f) =>
        f.formId === formId ? { ...f, ...patch, mdfcnDt: NOW } : f,
      ),
    })),

  duplicateForm: (formId) => {
    let copy: Form | null = null;
    set((s) => {
      const src = s.forms.find((f) => f.formId === formId);
      if (!src) return {};
      copy = {
        ...src,
        formId: nextId(s.forms, "formId"),
        formTtlNm: `${src.formTtlNm} (복사본)`,
        formSttsCd: "DRAFT",
        rcptBgngDt: null,
        rcptEndDt: null,
        qitemCpstCn: {
          pages: src.qitemCpstCn.pages.map((p) => ({ ...p })),
          qitems: src.qitemCpstCn.qitems.map((q) => ({ ...q })),
        },
        crtDt: NOW,
        mdfcnDt: NOW,
      };
      return { forms: [copy, ...s.forms] };
    });
    return copy;
  },

}));

/* ── 파생 ──────────────────────────────────────────────────── */

/** 폼 상태 배지 표기 */
export const FORM_STTS_BADGE: Record<
  FormSttsCd,
  { label: string; tone: "outline" | "blue" | "grey" }
> = {
  DRAFT: { label: "작성중", tone: "outline" },
  OPEN: { label: "접수중", tone: "blue" },
  CLOSED: { label: "마감", tone: "grey" },
};
