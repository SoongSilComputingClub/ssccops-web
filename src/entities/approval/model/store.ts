"use client";

import { create } from "zustand";
import seed from "../api/get-approvals.json";
import type { Approval } from "./types";

interface ApprovalState {
  approvals: Approval[];
  updateApproval: (id: string, patch: Partial<Approval>) => void;
  /** 정족수 찬성/반대 등록 */
  vote: (id: string, yes: boolean) => void;
  /** task 기준으로 대기 건 일괄 반려 */
  rejectByTask: (taskId: string, reason: string) => void;
}

export const useApprovalStore = create<ApprovalState>((set) => ({
  approvals: seed.data as Approval[],

  updateApproval: (id, patch) =>
    set((s) => ({
      approvals: s.approvals.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),

  vote: (id, yes) =>
    set((s) => ({
      approvals: s.approvals.map((a) => {
        if (a.id !== id || !a.quorum) return a;
        const quorum = yes
          ? { ...a.quorum, yes: Math.min(a.quorum.need, a.quorum.yes + 1) }
          : { ...a.quorum, no: a.quorum.no + 1 };
        return { ...a, quorum };
      }),
    })),

  rejectByTask: (taskId, reason) =>
    set((s) => ({
      approvals: s.approvals.map((a) =>
        a.task === taskId && a.state === "대기" ? { ...a, state: "반려", reason } : a,
      ),
    })),
}));

/** 승인 상태 배지 톤 */
export function approvalTone(state: string): "amber" | "blue" | "red" {
  if (state === "승인") return "blue";
  if (state === "반려") return "red";
  return "amber";
}
