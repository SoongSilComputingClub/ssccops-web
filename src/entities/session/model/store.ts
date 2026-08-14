"use client";

import { create } from "zustand";
import { createClient } from "@/shared/lib/supabase/client";
import type { AuthSession, AuthUser, MemberProfile, MemberRole } from "./types";

/**
 * 세션 부트스트랩 진행 상태.
 *
 * - `idle` 아직 조회하지 않음 (로그아웃 직후 포함)
 * - `pending` 조회 중
 * - `ready` 가입까지 끝난 회원 — 보호 라우트를 열어도 된다
 * - `signup-required` 인증은 됐지만 미가입 — 가입 화면 전용
 * - `error` 조회 실패 (백엔드 다운·네트워크·설정 누락). 재시도 UI가 필요하다
 */
export type SessionStatus = "idle" | "pending" | "ready" | "signup-required" | "error";

interface SessionState {
  status: SessionStatus;
  /** status === "error" 일 때 화면에 보여줄 메시지 */
  errorMessage: string | null;
  authUser: AuthUser | null;
  member: MemberProfile | null;
  /**
   * 아직 목 스토어(entities/member)를 참조하는 화면들이 쓰는 회원 식별자 — member.memberId 사본.
   * 목 데이터가 걷히면 함께 사라진다. 새 코드는 member를 직접 쓴다.
   */
  mbrId: number;
  /**
   * 방금 가입을 마친 회원 — 가입 완료 화면(/signup/complete)이 보여줄 값이다.
   *
   * 서버가 가입 응답으로 세션의 member와 같은 모양을 주므로 세션을 다시 조회하지 않는다.
   * 메모리에만 있어 새로고침하면 사라지는데, 그때는 서버 세션이 정본이므로 완료 화면이
   * 대시보드로 비켜 준다 — 예전처럼 목록의 마지막 회원을 대신 보여주지 않는다.
   */
  signupResult: MemberProfile | null;

  setSession: (session: AuthSession) => void;
  setStatus: (status: SessionStatus) => void;
  fail: (message: string) => void;
  /** 가입 성공을 기록한다. 세션 자체는 아직 signup-required로 둔다 (applySignupResult 주석 참고) */
  setSignupResult: (member: MemberProfile) => void;
  /** 가입 완료 화면을 떠나 서비스로 들어갈 때 — 가입 결과를 세션의 정본으로 승격한다 */
  applySignupResult: () => void;
  /** Supabase 로그아웃. 성공 여부를 돌려주므로 호출부가 실패를 사용자에게 알릴 수 있다 */
  logout: () => Promise<boolean>;
}

const EMPTY = {
  status: "idle" as SessionStatus,
  errorMessage: null,
  authUser: null,
  member: null,
  mbrId: 0,
  signupResult: null,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...EMPTY,

  setSession: (session) =>
    set({
      // 판정 근거는 서버가 준 signedUp 하나다 — 클라이언트에서 다시 추론하지 않는다
      status: session.signedUp ? "ready" : "signup-required",
      errorMessage: null,
      authUser: session.authUser,
      member: session.member,
      mbrId: session.member?.memberId ?? 0,
    }),

  setStatus: (status) => set({ status }),

  /*
   * 실패는 인증 정보까지 함께 비운다. 반쯤 남은 세션으로 화면을 그리면
   * "로그인은 된 것 같은데 아무것도 안 보이는" 상태가 되기 때문이다.
   */
  fail: (message) =>
    set({ status: "error", errorMessage: message, authUser: null, member: null, mbrId: 0 }),

  /*
   * 가입에 성공해도 status를 곧바로 ready로 올리지 않는다.
   *
   * 가입 화면은 SignupGate가 "인증됨 + 미가입"일 때만 열어 주는데, 제출 직후 ready가 되면
   * 게이트가 대시보드로 되돌리는 것과 완료 화면으로 이동하는 것이 동시에 일어나 어느 쪽이
   * 이길지 알 수 없다. 승격 시점을 "완료 화면을 떠날 때"로 미뤄 이 경합을 없앤다.
   */
  setSignupResult: (member) => set({ signupResult: member }),

  applySignupResult: () =>
    set((s) =>
      s.signupResult
        ? {
            status: "ready",
            member: s.signupResult,
            mbrId: s.signupResult.memberId,
            signupResult: null,
          }
        : {},
    ),

  logout: async () => {
    /*
     * 스토어를 먼저 비우면 signOut 실패 시 화면(로그아웃됨)과 실제 쿠키(로그인 유지)가
     * 어긋난다. 그래서 signOut 결과를 확인한 뒤에만 초기화한다.
     */
    const { error } = await createClient().auth.signOut();
    if (error) return false;
    set({ ...EMPTY });
    return true;
  },
}));

/** 사이드바 프로필 부제에 쓸 대표 역할 — 대표 지정이 없으면 현재 역할 중 첫 번째 */
export function representativeRole(member: MemberProfile | null): MemberRole | null {
  if (!member || member.roles.length === 0) return null;
  return member.roles.find((r) => r.representative) ?? member.roles[0];
}
