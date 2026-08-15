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

/*
 * 화면 노출을 판정하는 권한 코드 (ssccops-server AuthorityCode · authrt 테이블 · #9).
 *
 * ── 왜 묶음 코드(EXECUTIVE·OPERATOR·FORM_MANAGE …)를 여기 적지 않는가 ──────────
 * 권한은 트리다. EXECUTIVE 아래 OPERATOR가, OPERATOR 아래 FORM_MANAGE가, 그 아래
 * FORM_READ·FORM_WRITE·FORM_STATUS_CHANGE가 달려 있다. 그런데 **서버가 세션에 실어 주는
 * capabilities는 이미 자손까지 펼친 평평한 배열**이라(AuthorityPolicy.expandDownwards),
 * FORM_MANAGE를 가진 회원의 배열에는 FORM_WRITE도 이미 들어 있다.
 *
 * 그래서 화면은 **엔드포인트가 실제로 요구하는 잎 코드**만 본다. 서버 컨트롤러의
 * `@RequireAuthority`와 1:1로 맞춘 목록이 아래다.
 *
 *  - WORK_MANAGE          WorkController · SubWorkController 전체
 *  - SUB_WORK_TYPE_READ   GET  /v1/sub-work-types
 *  - SUB_WORK_TYPE_MANAGE POST·PATCH /v1/sub-work-types…
 *  - FORM_READ            GET  /v1/forms · /v1/forms/{id}
 *  - FORM_WRITE           POST·PUT /v1/forms… · duplicate · PUT /v1/forms/{id}/labels
 *  - FORM_STATUS_CHANGE   POST /v1/forms/{id}/status
 *  - FORM_LABEL_MANAGE    POST·PATCH /v1/form-labels…
 *  - RESPONSE_REVIEW      FormResponseController 전체
 *  - ROLE_MANAGE         AuthorityController · RoleAuthorityController 전체 (#32 · 서버 #65)
 *
 * ROLE_MANAGE 는 이 목록에서 유일하게 묶음처럼 생겼지만 **잎 코드로 다뤄도 되는 자리**다.
 * 서버가 두 컨트롤러 클래스 전체에 `@RequireAuthority(ROLE_MANAGE)`를 걸어 두어 이 코드 자체가
 * 엔드포인트가 요구하는 값이기 때문이다. 조회까지 막혀 있으므로 화면은 이 코드가 없으면 아예
 * 열지 않는다 — 열어 봐야 첫 조회부터 403이다.
 *
 * 묶음 코드로 판정하면 어긋난다. 예를 들어 어떤 역할에 FORM_WRITE만 직접 부여하면 그 회원의
 * 배열에 FORM_MANAGE는 없는데, 화면이 FORM_MANAGE를 찾으면 서버는 허용하는 버튼을 감춘다.
 * **역할 서열이나 트리 펼침을 웹이 다시 구현하지 않는다는 원칙과 같은 이유다** — 판정 규칙은
 * 서버의 AuthorityPolicy 한 곳에만 있고 웹은 배열에 코드가 있는지만 본다.
 */
export const CAPABILITY = {
  WORK_MANAGE: "WORK_MANAGE",
  SUB_WORK_TYPE_READ: "SUB_WORK_TYPE_READ",
  SUB_WORK_TYPE_MANAGE: "SUB_WORK_TYPE_MANAGE",
  FORM_READ: "FORM_READ",
  FORM_WRITE: "FORM_WRITE",
  FORM_STATUS_CHANGE: "FORM_STATUS_CHANGE",
  FORM_LABEL_MANAGE: "FORM_LABEL_MANAGE",
  RESPONSE_REVIEW: "RESPONSE_REVIEW",
  ROLE_MANAGE: "ROLE_MANAGE",
} as const;

export type Capability = (typeof CAPABILITY)[keyof typeof CAPABILITY];

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
  /**
   * 이 회원이 실제로 행사할 수 있는 권한 코드 전부 — **서버가 트리를 이미 펼친 평평한 배열**이다.
   *
   * 역할이 없거나 역할에 권한이 안 붙어 있으면 빈 배열이다(서버가 null을 주지 않는다).
   * 묶음 코드(EXECUTIVE·OPERATOR …)와 운영진이 화면에서 새로 만든 코드도 섞여 오므로 타입은
   * Capability[]가 아니라 string[]이다 — 웹이 아는 코드만 열거하면 그건 계약이 아니라 거짓말이
   * 된다. 판정은 {@link hasCapability}가 포함 여부로만 한다.
   */
  capabilities: string[];
}

/**
 * 이 회원이 해당 권한을 가졌는가.
 *
 * 배열을 뒤지는 곳은 여기 하나뿐이다. 화면은 features/auth의 useCan을 쓴다 — 각 화면이 직접
 * `capabilities.includes(...)`를 부르기 시작하면 미로그인·미가입(member === null)을 어떻게
 * 다룰지가 화면마다 갈린다.
 */
export function hasCapability(
  member: MemberProfile | null,
  capability: Capability,
): boolean {
  return member?.capabilities.includes(capability) ?? false;
}

/** 미가입 사용자도 200으로 내려온다 — signedUp 하나로 대시보드와 가입 화면을 가른다 */
export interface AuthSession {
  signedUp: boolean;
  authUser: AuthUser;
  member: MemberProfile | null;
}
