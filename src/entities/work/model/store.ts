"use client";

import { create } from "zustand";
import { nextKey } from "@/shared/lib/id";
import seed from "../api/get-operations-works.json";
import type { Work } from "./types";

interface WorkState {
  works: Work[];
  addWork: (draft: Omit<Work, "id">) => Work;
  updateWork: (id: string, patch: Partial<Work>) => void;
  /** 하위 업무 연결 */
  attachSub: (workId: string, taskId: string) => void;
}

export const useWorkStore = create<WorkState>((set) => ({
  works: seed.data as Work[],

  addWork: (draft) => {
    let work: Work = { ...draft, id: "" };
    set((s) => {
      work = { ...work, id: nextKey("w", s.works.length) };
      return { works: [...s.works, work] };
    });
    return work;
  },

  updateWork: (id, patch) =>
    set((s) => ({ works: s.works.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),

  attachSub: (workId, taskId) =>
    set((s) => ({
      works: s.works.map((w) =>
        w.id === workId ? { ...w, subs: [...w.subs, taskId] } : w,
      ),
    })),
}));

/** 업무 상태 배지 톤 */
export function workStatusTone(status: string): "grey" | "blue" | "amber" | "red" {
  if (status === "진행") return "blue";
  if (status === "검토") return "amber";
  if (status === "보류" || status === "취소") return "red";
  return "grey";
}
