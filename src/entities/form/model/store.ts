"use client";

import { create } from "zustand";
import type { FormSttsCd } from "@/shared/config/codes";
import { TODAY } from "@/shared/config/constants";
import { nextId } from "@/shared/lib/id";
import formSeed from "../api/get-form.json";
import formLblSeed from "../api/get-form-lbl.json";
import formLblRelSeed from "../api/get-form-lbl-rel.json";
import type { Form, FormLbl, FormLblRel } from "./types";

interface FormState {
  forms: Form[];
  formLbls: FormLbl[];
  formLblRels: FormLblRel[];

  updateForm: (formId: number, patch: Partial<Form>) => void;
  duplicateForm: (formId: number) => Form | null;

  addFormLbl: (lblNm: string) => void;
  toggleFormLbl: (formLblId: number) => void;
}

/*
 * `saveForm`·`setFormLbls`는 지웠다. 폼 편집기가 서버(POST·PUT /v1/forms)로 저장하게 됐고,
 * 라벨 지정도 그 본문의 labelIds로 함께 나간다(#8 · #10 합의). 목 구현을 남겨 두면 서버로
 * 저장한 뒤에도 화면이 메모리 배열을 고치는 경로가 되살아나, 새로고침하면 사라지는 저장이
 * 다시 생긴다. 남은 목(duplicateForm·라벨 관리)은 #9·#10에서 각각 서버로 옮긴다.
 */

const NOW = `${TODAY}T10:00:00`;

export const useFormStore = create<FormState>((set) => ({
  forms: formSeed.data as unknown as Form[],
  formLbls: formLblSeed.data as FormLbl[],
  formLblRels: formLblRelSeed.data as FormLblRel[],

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

  addFormLbl: (lblNm) =>
    set((s) => ({
      formLbls: [
        ...s.formLbls,
        {
          formLblId: nextId(s.formLbls, "formLblId"),
          lblNm,
          useYn: true,
          crtDt: NOW,
          mdfcnDt: NOW,
        },
      ],
    })),

  toggleFormLbl: (formLblId) =>
    set((s) => ({
      formLbls: s.formLbls.map((l) =>
        l.formLblId === formLblId ? { ...l, useYn: !l.useYn, mdfcnDt: NOW } : l,
      ),
    })),

}));

/* ── 파생 ──────────────────────────────────────────────────── */

/** 해당 폼에 지정된 라벨 */
export function formLblsOf(
  rels: FormLblRel[],
  lbls: FormLbl[],
  formId: number,
): FormLbl[] {
  const ids = new Set(rels.filter((r) => r.formId === formId).map((r) => r.formLblId));
  return lbls.filter((l) => ids.has(l.formLblId));
}

/** 폼 상태 배지 표기 */
export const FORM_STTS_BADGE: Record<
  FormSttsCd,
  { label: string; tone: "outline" | "blue" | "grey" }
> = {
  DRAFT: { label: "작성중", tone: "outline" },
  OPEN: { label: "접수중", tone: "blue" },
  CLOSED: { label: "마감", tone: "grey" },
};
