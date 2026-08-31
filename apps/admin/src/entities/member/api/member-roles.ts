import { apiFetch } from "@/shared/lib/api/client";

/*
 * 회원 역할 부여·종료 API (ssccops-server #81 · MemberRoleAssignmentController).
 *
 * ── 왜 회원 API(api/members.ts)와 파일을 나누는가 ────────────────
 * **요구 권한이 다르다.** 회원 조회·수정·등급·상태는 `MEMBER_MANAGE`지만 이 컨트롤러는
 * 클래스 전체가 `@RequireAuthority(ROLE_MANAGE)`이며 **조회도 예외가 아니다**(VR-M12).
 * 서버가 컨트롤러를 나눈 이유가 그것이고("회원 정보를 고칠 수 있다고 스스로에게 임원 역할을
 * 붙일 수 있으면 MEMBER_MANAGE가 사실상 최고 권한이 된다"), 화면도 같은 경계를 그린다 —
 * 회원 상세는 `MEMBER_MANAGE`로 열리지만 이 파일의 호출은 `ROLE_MANAGE` 없이는 전부 403이다.
 *
 * ── 여기가 인가 체계의 마지막 한 칸이다 ─────────────────────────
 * 이 API가 붙기 전까지 `mbr_role_rel`에 행이 생기는 길은 최초 가입자 부트스트랩(#71)뿐이라
 * **두 번째 회원부터는 어떤 권한도 받을 수 없었다.** 권한 트리(#29)도 역할별 권한 부여(#32)도
 * 이미 있었지만 역할을 사람에게 붙이는 자리가 비어 있었다.
 *
 * ── 종료는 삭제가 아니다 ────────────────────────────────────────
 * **`DELETE`가 없다.** 임기를 끝내는 유일한 길은 `roleEndYmd`를 채우는 PATCH이며 어느 경로도
 * 행을 지우지 않는다 — 지우면 "언제까지 국장이었는가"가 사라진다. 그래서 목록에는 지난
 * 재임까지 남고, 지금 유효한 것은 {@link MemberRoleAssignment.current}가 가른다.
 *
 * 필드명이 데이터사전 표기(mbrRoleId·roleBgngYmd …)인 것은 서버 DTO가 그렇게 내려주기
 * 때문이다 — 회원 API가 서버 스키마(memberId·systemJoinDate …)를 그대로 옮긴 것과 같은 원칙이고,
 * 두 API의 표기가 갈리는 것은 서버가 갈라 놓은 그대로다.
 */

/* ── 응답 ──────────────────────────────────────────────────── */

/**
 * 회원 역할 배정 한 건 (MemberRoleAssignmentResponse).
 *
 * `current`는 **서버가 조회할 때마다 다시 계산하는 파생 값**이다(BR-M25 ·
 * `roleBgngYmd <= 오늘 <= roleEndYmd`, 종료일 NULL이면 무기한, 오늘은 서버 시계).
 * 화면이 `roleEndYmd`만 보고 스스로 판단하면 **종료일이 미래로 채워진 배정**(임기가 정해진
 * 국장)을 지난 역할로 그리게 되고, 그 순간 배지와 실제 인가가 갈린다.
 */
export interface MemberRoleAssignment {
  /** PK · 배정 행 식별자. 종료·대표 지정(PATCH)이 가리키는 값이다 */
  mbrRoleId: number;
  mbrId: number;
  roleId: number;
  roleNm: string;
  /** 일자D · `YYYY-MM-DD` */
  roleBgngYmd: string;
  /** null이면 무기한 — 아직 끝나지 않은 임기다 */
  roleEndYmd: string | null;
  /**
   * 사이드바 프로필에 대표로 내걸 역할인가 — **표시용이며 인가와 무관하다**(BR-M26).
   *
   * 회원당 유효한 것 중 최대 1건이고, 새로 지정하면 서버가 같은 트랜잭션에서 기존 대표를
   * 내린다. 화면이 이 값을 권한처럼 읽히게 그리면 안 되는 이유가 여기 있다.
   */
  rprsRoleYn: boolean;
  /** 오늘이 배정 기간 안인가 — 판정은 서버가 한다 (위 주석) */
  current: boolean;
  crtDt: string;
  mdfcnDt: string;
}

/* ── 오류 코드 ─────────────────────────────────────────────── */

/**
 * 회원 역할 API가 돌려주는 오류 코드 (ssccops-server MemberErrorCode).
 *
 * **enum 이름이 아니라 본문에 실리는 코드 문자열이다.** 회원 API가 같은 자리에서 겪은 것과
 * 같다 — 서버의 `ROLE_PERIOD_INVALID`는 코드로 `"VALIDATION_FAILED"`를, `MEMBER_NOT_FOUND`는
 * `"NOT_FOUND"`를 내린다. enum 이름을 적어 두면 어느 화면도 그 분기를 타지 못한다.
 */
export const MEMBER_ROLE_ERROR = {
  /** 409 — 겹치는 기간에 같은 역할이 이미 부여돼 있다 */
  ROLE_ALREADY_ASSIGNED: "ROLE_ALREADY_ASSIGNED",
  /**
   * 409 — 이 조작으로 요청자 자신이 `ROLE_MANAGE`를 잃는다 (VR-M13).
   *
   * 서버가 교체를 적용하고 다시 물어보는 방식이라(RoleManageSelfLockGuard) 남이 끝내는 것은
   * 막지 않는다. 스스로를 잠가 아무도 되돌릴 수 없게 되는 것만 거절한다.
   */
  CANNOT_REVOKE_OWN_ROLE_MANAGE: "CANNOT_REVOKE_OWN_ROLE_MANAGE",
  /** 400 — 종료일이 시작일보다 이르다 (서버 enum은 `ROLE_PERIOD_INVALID`) */
  ROLE_PERIOD_INVALID: "VALIDATION_FAILED",
  /** 404 — 없는 배정이거나 **다른 회원의** 배정이다 (서버가 둘을 같은 코드로 감춘다) */
  ASSIGNMENT_NOT_FOUND: "MEMBER_ROLE_ASSIGNMENT_NOT_FOUND",
  /** 404 — 없는 역할. 화면이 들고 있는 역할 목록이 낡았다는 뜻이다 */
  ROLE_NOT_FOUND: "ROLE_NOT_FOUND",
  /** 404 — 없는 회원 (서버 enum은 `MEMBER_NOT_FOUND`) */
  MEMBER_NOT_FOUND: "NOT_FOUND",
  /** 403 — ROLE_MANAGE 권한 없음. 조회에도 온다 */
  FORBIDDEN: "FORBIDDEN",
} as const;

/* ── 조회 ──────────────────────────────────────────────────── */

/** 서버가 내려주는 배정 한 건 — 이름·날짜가 null로 올 수 있다 */
interface MemberRoleAssignmentResponse {
  mbrRoleId: number;
  mbrId: number;
  roleId: number;
  roleNm: string | null;
  roleBgngYmd: string | null;
  roleEndYmd: string | null;
  rprsRoleYn: boolean | null;
  current: boolean | null;
  crtDt: string;
  mdfcnDt: string;
}

/*
 * `roleNm`은 데이터사전상 NULL을 허용해 빈 문자열로 떨어뜨린다 — 화면이 `.trim()` 같은 문자열
 * 연산을 하므로 null 하나가 어디에서든 터진다(역할 목록 API가 같은 판단을 했다).
 *
 * `rprsRoleYn`·`current`의 null은 false로 굳힌다. 세 상태(참·거짓·모름)를 화면까지 올려 봐야
 * 그릴 방법이 없고, '모름'을 대표나 현재로 그리는 쪽이 언제나 더 나쁘다.
 */
function toAssignment(res: MemberRoleAssignmentResponse): MemberRoleAssignment {
  return {
    mbrRoleId: res.mbrRoleId,
    mbrId: res.mbrId,
    roleId: res.roleId,
    roleNm: res.roleNm ?? "",
    roleBgngYmd: res.roleBgngYmd ?? "",
    roleEndYmd: res.roleEndYmd,
    rprsRoleYn: res.rprsRoleYn ?? false,
    current: res.current ?? false,
    crtDt: res.crtDt,
    mdfcnDt: res.mdfcnDt,
  };
}

/**
 * GET /v1/members/{memberId}/roles — 역할 배정 목록 (시작일 내림차순).
 *
 * **기본은 전량이다.** `current`를 주지 않으면 종료된 배정까지 온다 — 종료는 삭제가 아니므로
 * 지난 재임이 목록에 남고, 화면은 그것을 '종료된 역할'로 따로 보여 준다. `current: true`는
 * 지금 유효한 것만 좁히는 옵션이며, 어느 쪽이든 행마다 실린 `current`가 배지를 가른다.
 *
 * 페이지 봉투가 없다(AP-11) — 한 사람이 맡는 역할은 지난 임기를 다 합쳐도 수십 건 규모다.
 *
 * `ROLE_MANAGE`가 없으면 **여기서부터** 403이다. 회원 상세는 `MEMBER_MANAGE`로 열리므로
 * 상세를 보는 사람이 이 목록을 못 받는 조합이 정상적으로 존재한다(화면 처리는 views/member-detail).
 */
export async function fetchMemberRoles(
  memberId: number,
  options: { current?: boolean } = {},
): Promise<MemberRoleAssignment[]> {
  const qs = options.current ? "?current=true" : "";
  const list = await apiFetch<MemberRoleAssignmentResponse[] | null>(
    `/v1/members/${memberId}/roles${qs}`,
  );
  return (list ?? []).map(toAssignment);
}

/* ── 부여 ──────────────────────────────────────────────────── */

/**
 * POST /v1/members/{memberId}/roles 요청 본문 (서버 `MemberRoleAssignRequest`).
 *
 * **종료일을 받지 않는다.** 부여는 언제나 무기한으로 시작하고 임기가 끝나면 PATCH로 종료일을
 * 채운다 — 자리를 만들면 "이미 끝난 역할을 만드는" 요청이 정상 경로가 된다.
 *
 * `roleBgngYmd`를 생략하면 **서버의 오늘**이다. 화면이 자기 시계로 오늘을 채워 보내지 않는
 * 것은 시간대가 다른 기기에서 하루 어긋난 배정이 남기 때문이다(등급·상태 변경과 같은 판단).
 * 과거 날짜는 막지 않는다 — 이미 맡고 있던 역할을 뒤늦게 반영하는 것이 이관 초기의 정상 조작이다.
 *
 * `rprsRoleYn`을 생략하면 false다.
 */
export interface MemberRoleAssignInput {
  roleId: number;
  /** 일자D · 생략하면 서버의 오늘 */
  roleBgngYmd?: string | null;
  /** 대표 역할로 지정할지 — 표시용이며 인가와 무관하다 (BR-M26) */
  rprsRoleYn?: boolean;
}

/**
 * POST /v1/members/{memberId}/roles — 회원에게 역할을 부여한다 (`ROLE_MANAGE`).
 *
 * **변경은 즉시 반영된다**(BR-M31) — 인가 판정이 요청마다 `mbr_role_rel`을 보므로 대상 회원은
 * 재로그인 없이 다음 요청부터 달라진다. 다만 **웹의 `capabilities`는 세션 응답에 한 번 실려 온
 * 값**이라, 자기 자신에게 부여했다면 세션을 다시 받지 않으면 화면만 옛 상태로 남는다
 * (features/member/model/use-member-roles.ts가 그 재조회를 맡는다).
 *
 * 오류는 409 `ROLE_ALREADY_ASSIGNED`(겹치는 기간에 같은 역할) · 404 `ROLE_NOT_FOUND` ·
 * 404 `NOT_FOUND`(없는 회원) · 403이다. 겹침 판정은 서버가 한다 — 화면이 먼저 잠그는 것은
 * 왕복을 아끼려는 것뿐이고 근거는 언제나 서버다.
 */
export async function assignMemberRole(
  memberId: number,
  input: MemberRoleAssignInput,
): Promise<MemberRoleAssignment> {
  const res = await apiFetch<MemberRoleAssignmentResponse>(`/v1/members/${memberId}/roles`, {
    method: "POST",
    body: JSON.stringify({
      roleId: input.roleId,
      roleBgngYmd: input.roleBgngYmd ?? null,
      rprsRoleYn: input.rprsRoleYn ?? null,
    }),
  });
  return toAssignment(res);
}

/* ── 종료 · 대표 지정 ──────────────────────────────────────── */

/**
 * PATCH /v1/members/{memberId}/roles/{mbrRoleId} 요청 본문 (서버 `MemberRoleUpdateRequest`).
 *
 * **여기서는 PATCH가 실제로 부분 수정이다** — null인 필드는 건드리지 않는다. 대표 여부만
 * 바꾸는 요청이 종료일을 함께 지우면 사이드바 표시를 고치려던 조작 하나가 이미 끝난 임기를
 * 되살려 인가 범위를 넓힌다(회원 정보 수정 PATCH가 전체 교체인 것과 갈리는 자리다).
 *
 * 그 대가로 **종료를 되돌리는 길이 이 경로에 없다.** 잘못 종료한 배정은 기간이 겹치지 않게
 * 다시 부여하는 것이 정상 경로이며, 그러면 기간이 끊긴 두 건으로 남는다 — 화면이 '종료'에
 * 확인 절차를 두는 이유다.
 *
 * **시작일은 받지 않는다.** 미래로 밀면 지금 유효한 역할이 조용히 사라지고 과거로 당기면 없던
 * 기간이 생긴다.
 */
export interface MemberRoleUpdateInput {
  /** 일자D · 채우면 임기가 끝난다. 생략하면 종료일을 건드리지 않는다 */
  roleEndYmd?: string | null;
  /** 대표 역할 지정·해제. 생략하면 건드리지 않는다 */
  rprsRoleYn?: boolean | null;
}

/**
 * PATCH /v1/members/{memberId}/roles/{mbrRoleId} — 임기 종료 · 대표 지정 (`ROLE_MANAGE`).
 *
 * **행을 지우지 않는다.** 종료는 `roleEndYmd`를 채우는 것이고 그 배정은 지난 재임으로 목록에
 * 남는다 — 역할 삭제 가드(#49 `ROLE_IN_USE`)가 지키려던 이력도 여기에 달려 있다.
 *
 * 오류는 409 `CANNOT_REVOKE_OWN_ROLE_MANAGE`(자기 잠금) · 400 `VALIDATION_FAILED`(종료일이
 * 시작일보다 이름) · 404 `MEMBER_ROLE_ASSIGNMENT_NOT_FOUND` · 403이다.
 */
export async function updateMemberRole(
  memberId: number,
  mbrRoleId: number,
  input: MemberRoleUpdateInput,
): Promise<MemberRoleAssignment> {
  const res = await apiFetch<MemberRoleAssignmentResponse>(
    `/v1/members/${memberId}/roles/${mbrRoleId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        roleEndYmd: input.roleEndYmd ?? null,
        rprsRoleYn: input.rprsRoleYn ?? null,
      }),
    },
  );
  return toAssignment(res);
}

/* ── 겹침 판정 ─────────────────────────────────────────────── */

/**
 * 이 역할을 `startDate`부터 부여하면 서버가 409 `ROLE_ALREADY_ASSIGNED`로 거절하는가.
 *
 * **서버 질의(`existsOverlappingAssignment`)를 그대로 옮긴 것이다** — 부여 요청이 종료일을
 * 받지 않아 새 배정이 언제나 `[시작일, ∞)`이므로, 겹침은 '기존 배정이 새 시작일 이후까지
 * 살아 있는가' 하나로 끝난다. 종료일이 NULL인 배정은 무기한이라 어떤 시작일과도 겹친다.
 *
 * ── 왜 `current`로 잠그지 않는가 ────────────────────────────────
 * 시작일을 고를 수 있기 때문이다. 오늘 기준 `current`만 보면 두 자리가 어긋난다 — 종료일이
 * 미래인 배정은 지금 유효하지만 그 뒤로 시작일을 잡으면 겹치지 않고(잠그면 안 되는데 잠긴다),
 * 시작일이 미래인 배정은 지금 유효하지 않지만 겹친다(잠가야 하는데 열린다).
 *
 * **판정 근거는 서버다.** 이 함수는 왕복 한 번을 아껴 그 자리에서 이유를 보여 줄 뿐이며,
 * 규칙이 낡으면 화면이 통과시킨 값이 서버에서 막힐 뿐 그 반대는 없다.
 */
export function overlapsAssignment(
  assignments: readonly MemberRoleAssignment[],
  roleId: number,
  startDate: string,
): boolean {
  return assignments.some(
    (a) => a.roleId === roleId && (a.roleEndYmd === null || a.roleEndYmd >= startDate),
  );
}
