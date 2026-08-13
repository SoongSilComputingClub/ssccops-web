"use client";

import { create } from "zustand";
import { nextKey } from "@/shared/lib/id";
import seed from "../api/get-operations-meetings.json";
import type { AgendaItem, Meeting } from "./types";

interface MeetingState {
  meetings: Meeting[];
  addMeeting: (draft: Omit<Meeting, "id">) => Meeting;
  updateAgenda: (meetingId: string, no: number, patch: Partial<AgendaItem>) => void;
  addAgenda: (meetingId: string, item: Omit<AgendaItem, "no">) => void;
  removeAgenda: (meetingId: string, no: number) => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  meetings: seed.data as Meeting[],

  addMeeting: (draft) => {
    let meeting: Meeting = { ...draft, id: "" };
    set((s) => {
      meeting = { ...meeting, id: nextKey("mt", s.meetings.length) };
      return { meetings: [...s.meetings, meeting] };
    });
    return meeting;
  },

  updateAgenda: (meetingId, no, patch) =>
    set((s) => ({
      meetings: s.meetings.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              agenda: m.agenda.map((a) => (a.no === no ? { ...a, ...patch } : a)),
            }
          : m,
      ),
    })),

  addAgenda: (meetingId, item) =>
    set((s) => ({
      meetings: s.meetings.map((m) =>
        m.id === meetingId
          ? { ...m, agenda: [...m.agenda, { ...item, no: m.agenda.length + 1 }] }
          : m,
      ),
    })),

  removeAgenda: (meetingId, no) =>
    set((s) => ({
      meetings: s.meetings.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              agenda: m.agenda
                .filter((a) => a.no !== no)
                .map((a, i) => ({ ...a, no: i + 1 })),
            }
          : m,
      ),
    })),
}));

/** 회의 상태 배지 톤 */
export function meetingStatusTone(status: string): "grey" | "blue" | "red" {
  if (status === "진행") return "blue";
  if (status === "취소") return "red";
  return "grey";
}

/** 안건 구분 톤: 결정=blue, 논의/보고=grey */
export function agendaKindTone(kind: string): "blue" | "grey" {
  return kind === "결정" ? "blue" : "grey";
}
