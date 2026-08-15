/*
 * 권한(authrt) 도메인 타입 — ssccops-server #65 의 DTO 를 그대로 옮긴다.
 *
 * 필드명이 이 저장소의 화면 어휘(roleNm·mbrNm …)와 달리 서버 컬럼명 그대로인 것은 의도한
 * 것이다. 권한 코드 문자열은 서버의 `@RequireAuthority` 가 가리키는 값과 같은 이름 공간을
 * 쓰므로, 웹에서 이름을 갈아 끼우면 "화면의 authrtCd" 와 "서버의 권한 코드" 가 두 벌이 된다.
 */

/**
 * 권한 트리의 노드 하나 (GET /v1/authorities · AuthorityTreeResponse).
 *
 * `children` 은 잎 노드에서도 null 이 아니라 빈 배열이다 — 서버가 그렇게 약속했으므로 재귀
 * 렌더링에서 null 검사를 한 번 더 하지 않는다.
 */
export interface AuthorityNode {
  /** PK · `^[A-Z][A-Z0-9_]*$` — 서버 `@RequireAuthority` 가 가리키는 값과 같은 이름 공간 */
  authrtCd: string;
  authrtNm: string;
  /** null 이면 최상위 권한 */
  upAuthrtCd: string | null;
  authrtExpln: string | null;
  /**
   * 시스템 권한 여부.
   *
   * true 면 **삭제·코드 변경이 불가**하다 — 코드가 이 값을 직접 가리키므로 지워지는 순간 그
   * 코드를 요구하는 엔드포인트를 아무도 통과하지 못한다. 이름·설명·트리 위치는 바꿀 수 있다.
   */
  sysYn: boolean;
  /** 같은 부모 아래에서의 표시 순번. 서버가 정렬해 내려주므로 웹은 다시 정렬하지 않는다 */
  indctSeqno: number | null;
  crtDt: string;
  mdfcnDt: string;
  children: AuthorityNode[];
}

/** 역할에 **직접** 부여된 권한 한 건 (RoleAuthorityResponse.RoleAuthorityGrant) */
export interface RoleAuthorityGrant {
  authrtCd: string;
  authrtNm: string;
  /** 이 권한이 이 역할에 붙은 시각. 전체 교체는 차집합만 움직이므로 유지되는 부여는 값이 그대로다 */
  crtDt: string;
}

/**
 * 역할이 가진 권한 (GET·PUT /v1/roles/{roleId}/authorities · RoleAuthorityResponse).
 *
 * ── grants 와 effectiveAuthrtCds 를 왜 둘 다 받는가 ─────────────
 * `grants` 는 체크박스에서 **실제로 체크된** 노드이고, `effectiveAuthrtCds` 는 서버가 트리를
 * 아래로 펼친 뒤의 결과다. 상위를 부여하면 자손이 함께 부여되므로 두 값은 다르다.
 *
 * **펼침을 웹이 다시 계산하지 않는다.** 서버 AuthorityPolicy 와 규칙이 갈리는 순간 체크 상태와
 * 실제 인가가 어긋나고, 그 어긋남은 아무도 눈치채지 못한 채 화면에만 남는다. 저장된 상태의
 * "부여됨" 표시는 언제나 이 배열이 근거다.
 */
export interface RoleAuthorities {
  roleId: number;
  roleNm: string;
  grants: RoleAuthorityGrant[];
  effectiveAuthrtCds: string[];
}

/** 권한 API 가 돌려주는 오류 코드 (ssccops-server MemberErrorCode) */
export const AUTHORITY_ERROR = {
  /** 409 — 시스템 권한을 지우거나 코드를 바꾸려 했다 */
  SYSTEM_AUTHORITY_IMMUTABLE: "SYSTEM_AUTHORITY_IMMUTABLE",
  /** 409 — 사용자 정의 권한의 코드를 바꾸려 했다. 새로 만든 뒤 기존 것을 지우는 길만 있다 */
  AUTHORITY_CODE_IMMUTABLE: "AUTHORITY_CODE_IMMUTABLE",
  /** 400 — 자기 자신이나 자기 자손을 상위로 지정했다 */
  AUTHORITY_CYCLE_DETECTED: "AUTHORITY_CYCLE_DETECTED",
  /** 409 — 어느 역할엔가 부여돼 있거나 자식 권한이 달려 있어 지울 수 없다 */
  AUTHORITY_IN_USE: "AUTHORITY_IN_USE",
  /** 409 — 이미 있는 권한 코드 */
  AUTHORITY_CODE_DUPLICATED: "AUTHORITY_CODE_DUPLICATED",
  /** 404 — 없는 권한 코드. 화면이 들고 있는 트리가 낡았다는 뜻이다 */
  AUTHORITY_NOT_FOUND: "AUTHORITY_NOT_FOUND",
  /** 404 — 없는 역할 */
  ROLE_NOT_FOUND: "ROLE_NOT_FOUND",
  /** 409 — 요청자 자신이 ROLE_MANAGE 를 잃게 되는 교체 (VR-M13) */
  CANNOT_REVOKE_OWN_ROLE_MANAGE: "CANNOT_REVOKE_OWN_ROLE_MANAGE",
  /** 400 — 코드 표기·길이 등 입력값 오류. 서버 문장이 어느 칸이 왜 틀렸는지를 담고 있다 */
  VALIDATION_FAILED: "VALIDATION_FAILED",
} as const;

/**
 * 권한 코드 표기 (서버 AuthorityCreateRequest 의 @Pattern 과 같은 값).
 *
 * 서버도 400 으로 막지만 왕복 한 번을 기다리지 않고 입력란 옆에서 바로 알려 준다. 표기가
 * 서버 AuthorityCode enum(UPPER_SNAKE_CASE)과 어긋나면 화면에 두 벌의 어휘가 생긴다.
 */
export const AUTHRT_CD_PATTERN = /^[A-Z][A-Z0-9_]*$/;
export const AUTHRT_CD_MAX_LENGTH = 50;
export const AUTHRT_NM_MAX_LENGTH = 50;
export const AUTHRT_EXPLN_MAX_LENGTH = 500;
