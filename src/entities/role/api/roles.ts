import { apiFetch } from "@/shared/lib/api/client";

/*
 * 역할 API (ssccops-server #79 · RoleController).
 *
 * ── 조회까지 ROLE_MANAGE 를 요구한다 ────────────────────────────
 * 서버가 컨트롤러 **클래스 전체**에 `@RequireAuthority(ROLE_MANAGE)` 를 걸었다(VR-M12) —
 * 역할은 권한이 붙는 자리라 역할을 만드는 것 자체가 인가 조작이고, 그래서 목록도 예외가
 * 아니다. 분류 API(role-classifications.ts)가 조회를 열어 둔 것과 갈리는 지점이다.
 *
 * 화면은 권한이 없으면 **호출조차 하지 않는다** — 어차피 403 이고, 오류 문구로 "권한 없음" 을
 * 알리는 것보다 처음부터 화면을 닫는 편이 정직하다(views/role-authorities 와 같은 방식).
 *
 * ── 타입은 서버 응답 스키마를 그대로 옮긴다 ──────────────────────
 * 목 스토어가 쓰던 시드 타입 `Role`(entities/role/model/types.ts)은 #54 에서 지웠다. 그쪽은
 * `roleClsfNm`·`memberCount` 가 없고 `roleNm` 이 null 을 허용해, 한 타입으로 합쳤다면 어느
 * 화면이 서버 값을 보고 있는지가 흐려졌을 것이다 — 역할 화면의 타입은 이 파일이 정본이다.
 */

/**
 * 역할 한 건 (RoleResponse — 목록·생성·수정 응답).
 *
 * `roleClsfNm` 은 컬럼이 아니라 분류 조인의 결과지만 함께 온다. 화면이 '직책' 이라고 써야
 * 하는데 코드만 내려오면 분류 목록을 한 번 더 받아 짝지어야 하기 때문이다.
 *
 * **`useYn`(비활성) 이 없다.** 데이터사전의 `role` 에 그 컬럼이 없다 — 없는 상태를 화면에서
 * 만들지 않는다.
 */
export interface RoleSummary {
  /** PK · 식별자N19. 이 값이 '권한 부여 ›'(#32)가 가리키는 역할이다 */
  roleId: number;
  /** 같은 분류 안의 표시 순번. 분류를 가로지르는 서열이 아니다 (VR-M11) */
  indctSeqno: number;
  roleNm: string;
  roleClsfCd: string;
  roleClsfNm: string;
  /**
   * **지금** 이 역할을 맡고 있는 회원 수 (서버 집계).
   *
   * `role_bgng_ymd <= 오늘 <= role_end_ymd`(종료일 NULL 이면 무기한)로, AuthorityPolicy 가 유효
   * 역할을 고르는 기준과 같다. 예전에는 화면이 목 회원 스토어를 훑어 셌는데, 그 배열은 이
   * 브라우저가 들고 있는 목 데이터일 뿐이라 실제 재임자 수와 무관했다.
   *
   * **삭제 가능 여부와는 기준이 다르다.** 이 값이 0 이어도 지난 배정 이력이 있으면 삭제는
   * 409 ROLE_IN_USE 로 거절된다 — 그래서 화면에 삭제 버튼을 두지 않았다(views/role-edit).
   */
  memberCount: number;
  crtDt: string;
  mdfcnDt: string;
}

/**
 * 역할에 재임 중인 회원 한 명 (RoleDetailResponse.RoleMember).
 *
 * 회원 관리 화면이 아니라 역할 상세에 딸린 목록이라 연락처·이메일은 오지 않는다 — 누가 맡고
 * 있는지를 알아보는 데 필요한 것은 이름과 학번, 그리고 언제부터인지다.
 */
export interface RoleMember {
  mbrId: number;
  mbrNm: string;
  stdntNo: string;
  /** 일자D · `YYYY-MM-DD` */
  roleBgngYmd: string;
  /** null 이면 무기한 */
  roleEndYmd: string | null;
  /**
   * 그 회원이 이 역할을 프로필에 대표로 내거는가라는 **표시용** 값이다.
   * 인가 판정은 이 값을 보지 않는다 (BR-M26).
   */
  rprsRoleYn: boolean;
}

/**
 * 역할 단건 (RoleDetailResponse) — 목록 응답 + 재임 회원.
 *
 * `members` 의 기준은 `memberCount` 와 같다(오늘이 배정 기간 안에 드는 배정만). 기준을 하나로
 * 두어야 "목록에는 3명인데 상세를 열면 2명" 이 되지 않는다. 지난 재임 이력은 여기 오지 않는다.
 *
 * `members` 는 배정 **행** 단위이고 `memberCount` 는 사람 단위다 — 한 회원에게 같은 역할이
 * 기간이 겹치게 두 번 배정된 데이터에서만 둘이 갈리는데, 서버가 그런 행을 접어 감추지 않는
 * 것은 화면에 보여야 고칠 수 있기 때문이다.
 */
export interface RoleDetail extends RoleSummary {
  members: RoleMember[];
}

/** 역할 API 가 돌려주는 오류 코드 (ssccops-server MemberErrorCode) */
export const ROLE_ERROR = {
  /** 400 — 역할명 누락·길이 초과 등. 서버 문장이 어느 칸이 왜 틀렸는지를 담고 있다 */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 404 — 없는 역할. 화면이 들고 있는 목록이 낡았다는 뜻이다 */
  ROLE_NOT_FOUND: "ROLE_NOT_FOUND",
  /** 409 — 같은 이름의 역할이 이미 있다. 이름 중복 판정의 **유일한** 근거다 */
  ROLE_NAME_DUPLICATED: "ROLE_NAME_DUPLICATED",
  /** 409 — 배정 이력이 있거나 권한이 붙어 있어 지울 수 없다 */
  ROLE_IN_USE: "ROLE_IN_USE",
  /** 404 — 없는 분류 코드를 지정했다. 분류 목록이 낡았다는 뜻이다 */
  ROLE_CLASSIFICATION_NOT_FOUND: "ROLE_CLASSIFICATION_NOT_FOUND",
} as const;

/** 역할명 최대 길이 (role.role_nm 명V100) — 서버 400 을 기다리지 않고 먼저 걸러 준다 */
export const ROLE_NM_MAX_LENGTH = 100;

/** 서버가 내려주는 역할 한 건 — 숫자·이름이 null 로 올 수 있다 */
interface RoleResponse {
  roleId: number;
  indctSeqno: number | null;
  roleNm: string | null;
  roleClsfCd: string;
  roleClsfNm: string | null;
  memberCount: number | null;
  crtDt: string;
  mdfcnDt: string;
}

interface RoleDetailResponse extends RoleResponse {
  members: RoleMember[] | null;
}

function toRoleSummary(res: RoleResponse): RoleSummary {
  return {
    roleId: res.roleId,
    indctSeqno: res.indctSeqno ?? 0,
    /*
     * 데이터사전의 `role_nm` 은 NULL 을 허용하지만 생성 요청이 @NotBlank 라 새로 만든 역할에는
     * 이름이 있다. 옛 데이터가 비어 올 수 있어 빈 문자열로 떨어뜨린다 — 화면 전체가
     * `roleNm.trim()` 같은 문자열 연산을 하므로 null 하나가 어디에서든 터질 수 있다.
     */
    roleNm: res.roleNm ?? "",
    roleClsfCd: res.roleClsfCd,
    roleClsfNm: res.roleClsfNm ?? res.roleClsfCd,
    memberCount: res.memberCount ?? 0,
    crtDt: res.crtDt,
    mdfcnDt: res.mdfcnDt,
  };
}

/**
 * GET /v1/roles — 역할 전체 (분류 순번 → 역할 순번 순).
 *
 * `roleClsfCd` 를 주면 그 분류만 걸러 온다. 다만 **목록 화면의 분류 칩은 이 파라미터를 쓰지
 * 않는다** — 역할은 수십 건 규모라 전량을 한 번 받아 두고 칩은 메모리에서 거른다. 칩을 누를
 * 때마다 왕복하면 "전체 N개" 를 함께 보여 줄 수 없고(필터된 응답에는 전체 수가 없다) 칩 사이를
 * 오갈 때마다 표가 깜빡인다. 파라미터를 남겨 두는 것은 분류 하나만 필요한 호출부(예: 역할
 * 부여 시트)가 생겼을 때 목록 전체를 받아 버리지 않게 하려는 것이다.
 *
 * 페이지 봉투가 없다(AP-11) — 역할은 기준 데이터라 관리 화면도 드롭다운도 전량을 그린다.
 */
export async function fetchRoles(roleClsfCd?: string): Promise<RoleSummary[]> {
  const qs = roleClsfCd ? `?roleClsfCd=${encodeURIComponent(roleClsfCd)}` : "";
  const list = await apiFetch<RoleResponse[] | null>(`/v1/roles${qs}`);
  return (list ?? []).map(toRoleSummary);
}

/** GET /v1/roles/{roleId} — 역할 한 건 + 재임 회원 */
export async function fetchRole(roleId: number): Promise<RoleDetail> {
  const res = await apiFetch<RoleDetailResponse>(`/v1/roles/${roleId}`);
  return { ...toRoleSummary(res), members: res.members ?? [] };
}

/** 역할 생성 본문 (RoleCreateRequest) */
export interface RoleCreateInput {
  roleNm: string;
  roleClsfCd: string;
  /**
   * 생략하면 서버가 **같은 분류 안의 최대값 + 1** 로 채운다.
   *
   * 화면은 순번 입력란을 두지 않아 언제나 생략한다 — 순번은 분류 안에서만 뜻이 있는 값이라
   * (VR-M11) 사용자가 숫자를 직접 넣으면 다른 역할과 겹치거나 빈 자리가 생기고, 그것을
   * 화면에서 다시 정리할 방법이 없다. 순서를 옮기는 화면이 필요해지면 그때 연다.
   */
  indctSeqno?: number;
}

/**
 * POST /v1/roles — 역할 생성.
 *
 * 이름이 겹치면 409 ROLE_NAME_DUPLICATED, 없는 분류면 404 ROLE_CLASSIFICATION_NOT_FOUND 다.
 * **중복 판정을 웹이 하지 않는다** — 예전에는 화면이 목록을 훑어 같은 이름을 찾았는데, 그
 * 목록은 이 브라우저가 마지막으로 받은 것이라 그 사이에 만들어진 역할을 알지 못한다.
 *
 * 갓 만든 역할에는 권한이 하나도 붙어 있지 않다 — 부여는 역할별 권한 화면(#32)에서 한다.
 *
 * 응답의 `roleId` 를 돌려주는 것은 만든 직후 그 역할로 이동할 수 있게 하기 위해서다.
 */
export async function createRole(input: RoleCreateInput): Promise<RoleSummary> {
  const res = await apiFetch<RoleResponse>("/v1/roles", {
    method: "POST",
    body: JSON.stringify({
      roleNm: input.roleNm,
      roleClsfCd: input.roleClsfCd,
      indctSeqno: input.indctSeqno ?? null,
    }),
  });
  return toRoleSummary(res);
}

/**
 * 역할 수정 본문 (RoleUpdateRequest) — **여기서는 PATCH 가 실제로 부분 수정이다.**
 *
 * 권한 수정(#65)이 메서드만 PATCH 이고 본문은 노드 한 벌 전체였던 것과 갈린다. 그쪽은
 * `upAuthrtCd` 의 '생략' 과 'null' 이 각각 "건드리지 마라" 와 "최상위로 올려라" 라는 서로 다른
 * 뜻이라 구별이 필요했다. 역할의 세 필드에는 그런 자리가 없다 — 이름도 분류도 순번도 비울 수
 * 없으므로 null 은 언제나 "그대로 두라" 하나로만 읽힌다.
 */
export interface RoleUpdateInput {
  roleNm?: string;
  roleClsfCd?: string;
  indctSeqno?: number;
}

/**
 * PATCH /v1/roles/{roleId} — 역할명·분류·순번 수정.
 *
 * **분류만 바꾸고 `indctSeqno` 를 생략하면 순번이 새 분류 안의 최대값 + 1 로 다시 매겨진다.**
 * 옛 분류에서 쓰던 숫자는 새 분류 안에서 아무 뜻이 없기 때문이다 — 화면이 순번을 들고 있지
 * 않으므로 분류를 옮긴 역할은 그 분류의 맨 뒤로 간다.
 *
 * 바뀐 값만 보낸다. 안 바뀐 필드까지 실어 보내면 그 사이에 다른 사람이 고친 값을 되돌린다.
 */
export async function updateRole(
  roleId: number,
  input: RoleUpdateInput,
): Promise<RoleSummary> {
  const res = await apiFetch<RoleResponse>(`/v1/roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify({
      roleNm: input.roleNm ?? null,
      roleClsfCd: input.roleClsfCd ?? null,
      indctSeqno: input.indctSeqno ?? null,
    }),
  });
  return toRoleSummary(res);
}

/**
 * DELETE /v1/roles/{roleId} — 역할 삭제.
 *
 * **지금 이 함수를 부르는 화면은 없다.** 서버는 아무에게도 배정된 적이 없고(종료된 배정도
 * 이력으로 본다) 권한도 붙어 있지 않을 때만 지우며, 그 밖에는 409 ROLE_IN_USE 다 — 실제로
 * 쓰이던 역할은 사실상 전부 여기 걸리므로 버튼을 두면 사용자는 실패만 보게 된다
 * (views/role-edit 의 주석). 계약을 여기 남겨 두는 것은, 만들자마자 잘못 만든 것을 지우는
 * 화면이 필요해졌을 때 호출 규약을 다시 뒤지지 않게 하려는 것이다.
 */
export async function deleteRole(roleId: number): Promise<void> {
  await apiFetch<unknown>(`/v1/roles/${roleId}`, { method: "DELETE" });
}
