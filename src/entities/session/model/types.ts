import type { MbrGrdCd, MbrSttsCd } from "@/shared/config/codes";

/*
 * GET /v1/auth/session 응답 스키마 (ssccops-server AuthSessionResponse).
 *
 * 필드명이 이 저장소의 다른 엔티티(mbrNm·mbrGrdCd …)와 다른 것은 의도한 것이다 —
 * 서버 계약을 그대로 옮겨 두어야 응답이 바뀌었을 때 어디를 고쳐야 하는지가 분명하다.
 * 목 데이터 기반 화면이 쓰는 Mbr 타입과는 별개로 둔다.
 */

/** 소셜 인증 계정. mbr이 아니라 Supabase JWT에서 온 값이라 가입 전에도 채워진다 */
export interface AuthUser {
  /** Supabase auth.users.id */
  id: string;
  email: string | null;
  name: string | null;
  /** google · github … — 소셜 프로바이더 */
  provider: string | null;
}

/** 회원이 현재 맡고 있는 조직 역할 한 건 */
export interface MemberRole {
  roleId: number;
  roleName: string;
  /** 여러 현재 역할 중 사이드바 프로필에 대표로 표시할 하나 */
  representative: boolean;
}

/**
 * 로그인한 본인의 회원 정보.
 *
 * 등급·상태는 코드와 명칭이 함께 내려온다. 분기는 코드로 하고 표시는 서버가 준 명칭을 쓴다 —
 * 명칭을 프론트에 하드코딩하면 기준정보 화면에서 이름을 바꿔도 반영되지 않는다.
 */
export interface MemberProfile {
  memberId: number;
  studentNumber: string | null;
  generationNumber: number | null;
  name: string;
  departmentName: string | null;
  academicYear: number | null;
  phoneNumber: string | null;
  email: string | null;
  membershipGradeCode: MbrGrdCd;
  membershipGradeName: string;
  membershipStatusCode: MbrSttsCd;
  membershipStatusName: string;
  /** yyyy-MM-dd */
  joinDate: string;
  roles: MemberRole[];
}

/** 미가입 사용자도 200으로 내려온다 — signedUp 하나로 대시보드와 가입 화면을 가른다 */
export interface AuthSession {
  signedUp: boolean;
  authUser: AuthUser;
  member: MemberProfile | null;
}
