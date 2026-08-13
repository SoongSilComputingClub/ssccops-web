"use client";

import { create } from "zustand";
import { nextKey } from "@/shared/lib/id";
import seed from "../api/get-operations-sub-works.json";
import type { SubWork } from "./types";

interface SubWorkState {
  tasks: SubWork[];
  addTask: (draft: Omit<SubWork, "id">) => SubWork;
  updateTask: (id: string, patch: Partial<SubWork>) => void;
  toggleCheck: (id: string, index: number) => void;
}

export const useSubWorkStore = create<SubWorkState>((set) => ({
  tasks: seed.data as SubWork[],

  addTask: (draft) => {
    let task: SubWork = { ...draft, id: "" };
    set((s) => {
      task = { ...task, id: nextKey("t", s.tasks.length) };
      return { tasks: [...s.tasks, task] };
    });
    return task;
  },

  updateTask: (id, patch) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

  toggleCheck: (id, index) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              checklist: t.checklist.map((c, i) =>
                i === index ? { ...c, done: !c.done } : c,
              ),
            }
          : t,
      ),
    })),
}));

/** 하위 업무 유형 배지 톤 (회계정산·행사=blue, 마감=red, 그 외=grey) */
export function subWorkTypeTone(type: string): "blue" | "grey" | "red" {
  if (type === "회계정산" || type === "행사") return "blue";
  if (type === "마감") return "red";
  return "grey";
}

/** 목록 상태: 승인 대기(amber) · 완료(grey) · 진행(blue) */
export function subWorkStatus(t: SubWork): { label: string; tone: "amber" | "grey" | "blue" } {
  if (t.approval === "대기") return { label: "승인 대기", tone: "amber" };
  if (t.stage >= 4 || t.progress === 100) return { label: "완료", tone: "grey" };
  return { label: "진행", tone: "blue" };
}

export function isSubWorkDone(t: SubWork): boolean {
  return t.stage >= 4 || t.progress === 100;
}
