"use client";

import { create } from "zustand";
import type { WorkSttsCd } from "@/shared/config/codes";
import { nextId } from "@/shared/lib/id";
import workSeed from "../api/get-work.json";
import type { Work } from "./types";

interface WorkState {
  works: Work[];

  addWork: (draft: Omit<Work, "workId">) => number;
  updateWork: (workId: number, patch: Partial<Work>) => void;
}

export const useWorkStore = create<WorkState>((set) => ({
  works: workSeed.data as Work[],

  addWork: (draft) => {
    let workId = 0;
    set((s) => {
      workId = nextId(s.works, "workId");
      return { works: [...s.works, { ...draft, workId }] };
    });
    return workId;
  },

  updateWork: (workId, patch) =>
    set((s) => ({
      works: s.works.map((w) => (w.workId === workId ? { ...w, ...patch } : w)),
    })),
}));

/** 업무_진행_률 표기 — "25%" */
export function workPrgrsRtText(work: Work): string {
  return `${Math.round(work.workPrgrsRt)}%`;
}

/** 업무 상태 배지 톤 */
export function workSttsTone(cd: WorkSttsCd): "blue" | "amber" | "grey" {
  if (cd === "IN_PROGRESS") return "blue";
  if (cd === "REVIEW") return "amber";
  return "grey";
}
