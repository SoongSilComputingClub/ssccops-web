import { apiFetch } from "@/shared/lib/api/client";

/*
 * 역할 분류 API (ssccops-server #80 · RoleClassificationController).
 *
 * ── 인가가 핸들러마다 갈린다 ────────────────────────────────────
 * 조회(GET)는 **인증만** 요구하고 생성·수정·삭제만 ROLE_MANAGE 를 요구한다. 역할 목록의 필터
 * 칩이 이 값을 쓰기 때문에 조회까지 막으면 역할을 볼 수 있는 사람이 분류로 거르지 못한다 —
 * 분류 이름(직책·부서·프로젝트 …) 자체는 조직 구조를 드러내지 않는다는 서버의 판단이다.
 * 그래서 관리 화면은 **누구에게나 열되 변경 버튼만 잠근다**(views/form-labels 와 같은 방식).
 *
 * ── 타입은 서버 응답 스키마를 그대로 옮긴다 ──────────────────────
 * 목 스토어가 쓰던 시드 타입 `RoleClsf`(entities/role/model/types.ts)는 #54 에서 지웠다.
 * 그쪽은 `roleCount` 가 없어, 한 타입으로 합쳤다면 어느 화면이 서버 값을 보고 있는지가
 * 흐려졌을 것이다 — 분류 화면의 타입은 이 파일이 정본이다.
 */

/**
 * 역할 분류 한 건 (RoleClassificationResponse).
 *
 * **`useYn`(비활성) 이 없다.** 데이터사전의 `role_clsf` 에 그 컬럼이 없어 서버도 내리지 않는다 —
 * 폼 라벨과 갈리는 지점이다(그쪽은 컬럼이 있어 비활성화가 삭제를 대신한다). 없는 개념을
 * 화면에서 만들지 않는다.
 *
 * `crtDt`·`mdfcnDt` 도 없다. `role_clsf` 에는 감사 컬럼 자체가 없다.
 */
export interface RoleClassification {
  /** PK · 코드V20 · `^[A-Z][A-Z0-9_]{1,19}$` — 생성 후 바꿀 수 없다 */
  roleClsfCd: string;
  roleClsfNm: string;
  /** 목록 표시 순번. 서버가 이 값으로 정렬해 내려주므로 웹은 다시 정렬하지 않는다 */
  indctSeqno: number;
  /**
   * 이 분류에 속한 역할 수 (서버 집계).
   *
   * 0 이 아니면 삭제가 409 ROLE_CLASSIFICATION_IN_USE 로 거절된다. 화면은 이 값으로 삭제
   * 버튼을 먼저 잠그지만 **판정 근거는 서버**다 — 화면이 들고 있는 목록은 낡을 수 있다.
   */
  roleCount: number;
}

/** 역할 분류 API 가 돌려주는 오류 코드 (ssccops-server MemberErrorCode) */
export const ROLE_CLASSIFICATION_ERROR = {
  /** 400 — 코드 표기·이름 길이 등. 서버 문장이 어느 칸이 왜 틀렸는지를 담고 있다 */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 404 — 없는 분류 코드. 화면이 들고 있는 목록이 낡았다는 뜻이다 */
  ROLE_CLASSIFICATION_NOT_FOUND: "ROLE_CLASSIFICATION_NOT_FOUND",
  /** 409 — 이미 있는 분류 코드 */
  ROLE_CLASSIFICATION_CODE_DUPLICATED: "ROLE_CLASSIFICATION_CODE_DUPLICATED",
  /** 409 — 소속 역할이 있어 지울 수 없다. 역할을 다른 분류로 먼저 옮겨야 한다 */
  ROLE_CLASSIFICATION_IN_USE: "ROLE_CLASSIFICATION_IN_USE",
  /** 409 — `SYSTEM` 분류의 삭제·이름 변경. 순번 변경만 허용된다 */
  SYSTEM_ROLE_CLASSIFICATION_IMMUTABLE: "SYSTEM_ROLE_CLASSIFICATION_IMMUTABLE",
} as const;

/**
 * 분류 코드 표기 (서버 RoleClassificationCreateRequest 의 @Pattern 과 같은 값).
 *
 * 대문자로 시작하고 대문자·숫자·밑줄만, 길이 2~20자. 서버도 400 으로 막지만 왕복 한 번을
 * 기다리지 않고 입력란 옆에서 바로 알려 준다.
 *
 * **프런트가 코드를 채번하지 않는다.** 예전 목 구현은 `CLSF_n` 을 스스로 붙였는데, 이 값은
 * 데이터사전의 표준코드 시트에 사람이 등재하는 코드라 뜻이 읽혀야 한다 — 일련번호를 등재하면
 * 시트가 아무것도 설명하지 못한다. 운영진이 `TF` 처럼 뜻이 드러나는 코드를 직접 정한다.
 */
export const ROLE_CLSF_CD_PATTERN = /^[A-Z][A-Z0-9_]{1,19}$/;
export const ROLE_CLSF_NM_MAX_LENGTH = 50;

/**
 * 시드 분류 중 유일하게 잠긴 코드.
 *
 * 서버 RoleClassificationServiceImpl 이 이 코드 하나만 상수로 들고 삭제·이름 변경을 409 로
 * 거절한다(순번 변경은 허용). '최고관리자' 역할이 여기 매달려 있어 분류가 사라지거나 이름이
 * 바뀌면 인가의 뿌리를 화면에서 흔들 수 있기 때문이다. 화면도 같은 코드로 버튼을 잠근다 —
 * 목록 응답에 '잠김' 플래그가 없어 코드 문자열이 유일한 근거다.
 */
export const SYSTEM_ROLE_CLSF_CD = "SYSTEM";

/** 서버가 내려주는 분류 한 건 — 숫자 필드가 null 로 올 수 있다 */
interface RoleClassificationResponse {
  roleClsfCd: string;
  roleClsfNm: string;
  indctSeqno: number | null;
  roleCount: number | null;
}

function toRoleClassification(res: RoleClassificationResponse): RoleClassification {
  return {
    roleClsfCd: res.roleClsfCd,
    roleClsfNm: res.roleClsfNm,
    indctSeqno: res.indctSeqno ?? 0,
    roleCount: res.roleCount ?? 0,
  };
}

/**
 * GET /v1/role-classifications — 분류 전체.
 *
 * 페이지 봉투가 없다(AP-11). 운영진이 손으로 만드는 기준 데이터라 수십 건을 넘지 않고, 필터
 * 칩도 관리 표도 전량을 한 번에 그린다.
 */
export async function fetchRoleClassifications(): Promise<RoleClassification[]> {
  const list = await apiFetch<RoleClassificationResponse[] | null>(
    "/v1/role-classifications",
  );
  return (list ?? []).map(toRoleClassification);
}

/** 분류 생성 본문 (RoleClassificationCreateRequest) */
export interface RoleClassificationCreateInput {
  /** 사용자가 직접 입력한다 — 서버도 웹도 채번하지 않는다 */
  roleClsfCd: string;
  roleClsfNm: string;
  /** 생략하면 서버가 뒤쪽으로 밀어 둔다 */
  indctSeqno?: number;
}

/**
 * POST /v1/role-classifications — 분류 생성 (ROLE_MANAGE).
 *
 * 응답 본문을 쓰지 않는다. 생성 직후 화면은 목록을 다시 받는다 — 새 분류가 몇 번째로 그려지고
 * `roleCount` 가 얼마인지는 서버가 정하는데, 응답 한 행을 웹이 배열에 끼워 넣기 시작하면 그
 * 규칙을 웹이 흉내 내게 된다.
 */
export async function createRoleClassification(
  input: RoleClassificationCreateInput,
): Promise<void> {
  await apiFetch<unknown>("/v1/role-classifications", {
    method: "POST",
    body: JSON.stringify({
      roleClsfCd: input.roleClsfCd,
      roleClsfNm: input.roleClsfNm,
      // 생략과 null 이 같은 뜻이다(둘 다 "서버가 정하라") — 서버가 Integer 로 받는다
      indctSeqno: input.indctSeqno ?? null,
    }),
  });
}

/**
 * PATCH /v1/role-classifications/{roleClsfCd} — 이름·순번 수정 (ROLE_MANAGE).
 *
 * **`roleClsfCd` 는 본문에 없다.** PK 이자 `role.role_clsf_cd` 가 NOT NULL FK 로 가리키는 값이라
 * 애초에 편집 대상이 아니며, 필드를 두면 바꿀 수 있는 것처럼 읽힌다. 코드를 바꾸는 경로는
 * '새로 만들고 → 역할을 옮기고 → 기존 것을 지운다' 하나뿐이다.
 *
 * `indctSeqno` 를 생략하면 현재 값을 유지한다 — 이름만 고치는 화면이 순번까지 들고 있지
 * 않아도 되게 서버가 그렇게 정했다.
 */
export async function updateRoleClassification(
  roleClsfCd: string,
  input: { roleClsfNm: string; indctSeqno?: number },
): Promise<void> {
  await apiFetch<unknown>(`/v1/role-classifications/${encodeURIComponent(roleClsfCd)}`, {
    method: "PATCH",
    body: JSON.stringify({
      roleClsfNm: input.roleClsfNm,
      indctSeqno: input.indctSeqno ?? null,
    }),
  });
}

/**
 * DELETE /v1/role-classifications/{roleClsfCd} — 분류 삭제 (ROLE_MANAGE).
 *
 * 소속 역할이 하나라도 있으면 409 ROLE_CLASSIFICATION_IN_USE, `SYSTEM` 이면 409
 * SYSTEM_ROLE_CLASSIFICATION_IMMUTABLE 이다. 화면이 `roleCount` 로 먼저 잠그지만 **판정
 * 근거는 서버**다 — 화면이 들고 있는 숫자는 다른 사람이 방금 역할을 옮겼으면 이미 낡았다.
 */
export async function deleteRoleClassification(roleClsfCd: string): Promise<void> {
  await apiFetch<unknown>(`/v1/role-classifications/${encodeURIComponent(roleClsfCd)}`, {
    method: "DELETE",
  });
}
