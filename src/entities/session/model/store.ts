"use client";

import { create } from "zustand";
import { createClient } from "@/shared/lib/supabase/client";

export interface PendingAuthUser {
  /** Supabase auth.users.id — mbr.auth_user_id 와 연결된다 */
  id: string;
  email: string;
  name?: string;
  /** 소셜 로그인 제공자 — 세션에서만 얻는 값이며 mbr 컬럼이 아니다 */
  provider?: string;
}

interface SessionState {
  /** 로그인한 회원의 mbr_id (0 = 미인증) */
  mbrId: number;
  /** 방금 가입 완료한 회원의 mbr_id (가입 완료 화면용) */
  pendingMbrId: number | null;
  /** Supabase 인증은 됐지만 아직 내부 mbr 와 연결되지 않은 사용자 (회원가입 화면용) */
  pendingAuthUser: PendingAuthUser | null;
  login: (mbrId: number) => void;
  logout: () => Promise<void>;
  setPending: (mbrId: number | null) => void;
  setPendingAuthUser: (user: PendingAuthUser | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  mbrId: 0,
  pendingMbrId: null,
  pendingAuthUser: null,
  login: (mbrId) => set({ mbrId }),
  logout: async () => {
    await createClient().auth.signOut();
    set({ mbrId: 0, pendingMbrId: null, pendingAuthUser: null });
  },
  setPending: (pendingMbrId) => set({ pendingMbrId }),
  setPendingAuthUser: (pendingAuthUser) => set({ pendingAuthUser }),
}));
