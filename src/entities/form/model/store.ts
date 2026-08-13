"use client";

import { create } from "zustand";
import { TODAY } from "@/shared/config/constants";
import { nextFormId, nextKey } from "@/shared/lib/id";
import formsSeed from "../api/get-forms.json";
import labelsSeed from "../api/get-forms-labels.json";
import type { Form, FormLabel, FormStatus } from "./types";

interface FormState {
  forms: Form[];
  labels: FormLabel[];

  updateForm: (key: string, patch: Partial<Form>) => void;
  /** 신규/수정 저장 — 저장된 폼 반환 */
  saveForm: (draft: Form, status: FormStatus) => Form;
  duplicateForm: (key: string) => Form | null;

  addLabel: (name: string) => void;
  toggleLabel: (name: string) => void;
}

export const useFormStore = create<FormState>((set) => ({
  forms: formsSeed.data as Form[],
  labels: labelsSeed.data as FormLabel[],

  updateForm: (key, patch) =>
    set((s) => ({
      forms: s.forms.map((f) => (f.key === key ? { ...f, ...patch } : f)),
    })),

  saveForm: (draft, status) => {
    let saved: Form = draft;
    set((s) => {
      if (draft.key) {
        saved = { ...draft, status, updated: TODAY };
        return { forms: s.forms.map((f) => (f.key === draft.key ? saved : f)) };
      }
      saved = {
        ...draft,
        key: nextKey("f", s.forms.length),
        id: nextFormId(s.forms.length),
        status,
        updated: TODAY,
      };
      return { forms: [saved, ...s.forms] };
    });
    return saved;
  },

  duplicateForm: (key) => {
    let copy: Form | null = null;
    set((s) => {
      const src = s.forms.find((f) => f.key === key);
      if (!src) return {};
      copy = {
        ...src,
        key: nextKey("f", s.forms.length),
        id: nextFormId(s.forms.length),
        title: `${src.title} (복사본)`,
        status: "DRAFT",
        slug: "",
        start: "",
        end: "",
        by: "김도현",
        created: TODAY,
        updated: TODAY,
        pages: src.pages.map((p) => ({ ...p })),
        questions: src.questions.map((q) => ({ ...q })),
      };
      return { forms: [copy, ...s.forms] };
    });
    return copy;
  },

  addLabel: (name) => set((s) => ({ labels: [...s.labels, { name, on: true }] })),

  toggleLabel: (name) =>
    set((s) => ({
      labels: s.labels.map((l) => (l.name === name ? { ...l, on: !l.on } : l)),
    })),
}));

/** 폼 상태 표기 (FSTAT) */
export const FORM_STATUS: Record<
  FormStatus,
  { label: string; tone: "outline" | "blue" | "grey" }
> = {
  DRAFT: { label: "작성중", tone: "outline" },
  OPEN: { label: "접수중", tone: "blue" },
  CLOSED: { label: "마감", tone: "grey" },
};

/** 공개 링크 슬러그 생성 (원본 규칙: 특수문자·한글 → "-", 24자, 소문자 + 랜덤 4자) */
export function makeSlug(title: string, seed: string): string {
  const base = title
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .toLowerCase();
  const suffix = seed
    .split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 1679616, 7)
    .toString(36)
    .padStart(4, "0");
  return `${base || "form"}-${suffix}`;
}
