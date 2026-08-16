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

/** 완료 화면이 방금 일어난 일을 무엇이라 부를지 — 새 가입인가, 기존 회원과의 연결인가 (#58) */
export type SignupResultKind = "signup" | "link";

interface SessionState {
  status: SessionStatus;
  /** status === "error" 일 때 화면에 보여줄 메시지 */
  errorMessage: string | null;
  authUser: AuthUser | null;
  member: MemberProfile | null;
  /**
   * 아직 목 스토어를 조작하는 화면들이 쓰는 회원 식별자 — member.memberId 사본.
   *
   * 회원·역할 목 스토어는 #54에서 걷혔고, 지금 이 값을 읽는 곳은 결재 목 스토어
   * (features/approval)뿐이다. 그쪽이 서버로 옮겨 가면 함께 사라진다 — 새 코드는 member를
   * 직접 쓴다.
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
  /**
   * `signupResult`가 어느 경로로 채워졌는가 (#58).
   *
   * - `signup` 새 회원으로 가입했다 — 임시회원 등급이 부여된 새 행이다
   * - `link` 이미 명부에 있던(CSV로 이관된) 회원에 이 계정을 붙였다 — 행은 원래 있던 것이다
   *
   * 완료 화면의 문장이 갈리기 때문에 둔다. 두 경로에 같은 "회원 가입이 완료되었습니다"를
   * 보여 주면, 연결한 사람은 자기가 방금 **새 회원을 하나 더 만든 것인지** 알 수 없다 —
   * 그것이 이 화면이 막으려던 바로 그 사고(같은 사람이 두 행이 되는 것)다.
   */
  signupResultKind: SignupResultKind;

  setSession: (session: AuthSession) => void;
  /**
   * 본인이 방금 고친 프로필을 세션에 반영한다 (PATCH /v1/members/me · #47).
   *
   * 서버가 수정 응답으로 세션의 member와 같은 모양(`MemberProfileResponse`)을 주므로 세션을
   * 다시 조회하지 않는다 — 가입 응답을 그대로 쓰는 것과 같은 계약이다. 다시 조회하면 왕복 한
   * 번 동안 사이드바에 옛 이름이 남고, 그 사이 조회가 실패하면 저장은 됐는데 화면만 낡은
   * 상태가 된다.
   *
   * `status`를 건드리지 않는 것은 이 갱신이 로그인·가입 상태를 바꾸지 않기 때문이다 —
   * 이 화면은 이미 ready인 회원만 연다.
   */
  applyMyProfile: (member: MemberProfile) => void;
  setStatus: (status: SessionStatus) => void;
  fail: (message: string) => void;
  /** 가입 성공을 기록한다. 세션 자체는 아직 signup-required로 둔다 (applySignupResult 주석 참고) */
  setSignupResult: (member: MemberProfile) => void;
  /**
   * 기존 회원과의 연결 성공을 기록한다 (POST /v1/members/link · #58).
   *
   * 승격을 미루는 규칙은 가입과 같아 값도 같은 자리(`signupResult`)에 담는다 — 완료 화면이
   * 둘을 같은 방식으로 그리고 `applySignupResult`로 세션에 올린다. 다른 것은 종류뿐이다.
   */
  setLinkResult: (member: MemberProfile) => void;
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
  signupResultKind: "signup" as SignupResultKind,
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

  /* 인터페이스 쪽 주석 참고 — 서버 응답이 세션의 member와 같은 모양이라 그대로 갈아 끼운다 */
  applyMyProfile: (member) => set({ member, mbrId: member.memberId }),

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
  setSignupResult: (member) => set({ signupResult: member, signupResultKind: "signup" }),

  setLinkResult: (member) => set({ signupResult: member, signupResultKind: "link" }),

  applySignupResult: () =>
    set((s) =>
      s.signupResult
        ? {
            status: "ready",
            member: s.signupResult,
            mbrId: s.signupResult.memberId,
            signupResult: null,
            /* 종류는 되돌리지 않는다 — 완료 화면이 사라지기 전에 문장이 바뀌면 안 된다 */
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
