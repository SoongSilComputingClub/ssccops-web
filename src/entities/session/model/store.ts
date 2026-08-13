"use client";

import { create } from "zustand";

interface SessionState {
  /** 로그인한 회원의 key (PoC: 기본 로그인 상태 김도현/m1 — 딥링크 동작 보장) */
  memberKey: string;
  /** 방금 가입 완료한 회원 key (가입 완료 화면용) */
  pendingKey: string | null;
  login: (memberKey: string) => void;
  logout: () => void;
  setPending: (memberKey: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  memberKey: "m1",
  pendingKey: null,
  login: (memberKey) => set({ memberKey }),
  logout: () => set({ memberKey: "m1", pendingKey: null }),
  setPending: (pendingKey) => set({ pendingKey }),
}));
