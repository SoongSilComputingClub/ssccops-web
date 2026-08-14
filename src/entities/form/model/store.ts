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
  /** 신규/수정 저장 — 저장된 폼 반환 */
  saveForm: (draft: Form, formSttsCd: FormSttsCd) => Form;
  duplicateForm: (formId: number) => Form | null;

  addFormLbl: (lblNm: string) => void;
  toggleFormLbl: (formLblId: number) => void;
  /** 폼에 지정된 라벨 교체 */
  setFormLbls: (formId: number, formLblIds: number[]) => void;
}

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

  saveForm: (draft, formSttsCd) => {
    let saved: Form = draft;
    set((s) => {
      if (draft.formId) {
        saved = { ...draft, formSttsCd, mdfcnDt: NOW };
        return { forms: s.forms.map((f) => (f.formId === draft.formId ? saved : f)) };
      }
      saved = {
        ...draft,
        formId: nextId(s.forms, "formId"),
        formSttsCd,
        crtDt: NOW,
        mdfcnDt: NOW,
      };
      return { forms: [saved, ...s.forms] };
    });
    return saved;
  },

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

  setFormLbls: (formId, formLblIds) =>
    set((s) => {
      const kept = s.formLblRels.filter((r) => r.formId !== formId);
      let seq = kept.reduce((m, r) => Math.max(m, r.formLblRelId), 0);
      const added = formLblIds.map((formLblId) => ({
        formLblRelId: ++seq,
        formId,
        formLblId,
        crtDt: NOW,
      }));
      return { formLblRels: [...kept, ...added] };
    }),
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
