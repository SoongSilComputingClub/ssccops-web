"use client";

import { create } from "zustand";
import { createClient } from "@/shared/lib/supabase/client";

export interface PendingAuthUser {
  id: string;
  email: string;
  name?: string;
}

interface SessionState {
  /** 로그인한 회원의 key — Supabase Auth 세션과 연결된 Member.key ("" = 미인증) */
  memberKey: string;
  /** 방금 가입 완료한 회원 key (가입 완료 화면용) */
  pendingKey: string | null;
  /** Supabase 인증은 됐지만 아직 내부 Member와 연결되지 않은 사용자 (회원가입 화면용) */
  pendingAuthUser: PendingAuthUser | null;
  login: (memberKey: string) => void;
  logout: () => Promise<void>;
  setPending: (memberKey: string | null) => void;
  setPendingAuthUser: (user: PendingAuthUser | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  memberKey: "",
  pendingKey: null,
  pendingAuthUser: null,
  login: (memberKey) => set({ memberKey }),
  logout: async () => {
    await createClient().auth.signOut();
    set({ memberKey: "", pendingKey: null, pendingAuthUser: null });
  },
  setPending: (pendingKey) => set({ pendingKey }),
  setPendingAuthUser: (pendingAuthUser) => set({ pendingAuthUser }),
}));
