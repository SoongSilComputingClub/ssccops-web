"use client";

import { create } from "zustand";
import { nextKey } from "@/shared/lib/id";
import seed from "../api/get-forms-responses.json";
import type { FormResponse, ResponseStatus } from "./types";

interface ResponseState {
  responses: FormResponse[];
  setStatus: (id: string, status: ResponseStatus) => void;
  addResponse: (draft: Omit<FormResponse, "id">) => FormResponse;
}

export const useResponseStore = create<ResponseState>((set) => ({
  responses: seed.data as unknown as FormResponse[],

  setStatus: (id, status) =>
    set((s) => ({
      responses: s.responses.map((r) => (r.id === id ? { ...r, status } : r)),
    })),

  addResponse: (draft) => {
    let response: FormResponse = { ...draft, id: "" };
    set((s) => {
      response = { ...response, id: nextKey("resp", s.responses.length) };
      return { responses: [...s.responses, response] };
    });
    return response;
  },
}));

/**
 * 응답 상태 표기 — 원본 RSTAT에 ACCEPTED/REJECTED가 누락된 잠재 버그를 보완
 * (응답 탭·응답 요약이 승인/반려를 참조)
 */
export const RESPONSE_STATUS: Record<
  ResponseStatus,
  { label: string; tone: "blue" | "grey" | "red" }
> = {
  SUBMITTED: { label: "제출", tone: "blue" },
  DRAFT: { label: "임시저장", tone: "grey" },
  ACCEPTED: { label: "승인", tone: "blue" },
  REJECTED: { label: "반려", tone: "red" },
};
