/*
 * GET /v1/auth/session 응답 (ssccops-server AuthSessionResponse).
 *
 * **어드민의 같은 타입보다 훨씬 좁다.** 저쪽은 권한 배열(capabilities)·등급·역할까지 받아
 * 화면을 잠그고 여는 데 쓰지만, 이 앱에는 권한으로 갈리는 화면이 없다 — '내 신청'은 로그인한
 * 본인의 것만 보여 주고 서버도 권한을 요구하지 않는다. 그래서 여기서는 **화면이 실제로 읽는
 * 필드만** 선언한다. 응답에 더 많은 값이 실려 와도 무시하면 그만이고, 쓰지 않는 계약을 옮겨
 * 적어 두면 서버가 바꿨을 때 고쳐야 하는 자리만 늘어난다.
 */

/** 소셜 인증 계정 — Supabase JWT에서 온 값이라 가입 전에도 채워진다 */
export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

/** 가입까지 마친 회원 — 미가입이면 통째로 null이다 */
export interface AuthMember {
  memberId: number;
  name: string;
}

/** 미가입 사용자도 200으로 내려온다 — `signedUp` 하나로 '내 신청'과 가입 안내를 가른다 */
export interface AuthSession {
  signedUp: boolean;
  authUser: AuthUser;
  member: AuthMember | null;
}
