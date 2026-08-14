/** table: role — 역할 */
export interface Role {
  /** 식별자N19 · PK */
  roleId: number;
  /** 순번N5 — 화면 표시 및 정렬 순서 */
  indctSeqno: number;
  /** 명V100 — 회장/부회장/총무/국장/국원/프로젝트장/스터디장 등 */
  roleNm: string | null;
  /** FK role_clsf.role_clsf_cd */
  roleClsfCd: string;
  crtDt: string;
  mdfcnDt: string;
}

/**
 * table: role_clsf — 역할_분류 (사용자 관리 코드테이블)
 * 화면(`/members/role-labels`)에서 추가·수정·삭제하므로 코드값이 고정되지 않는다.
 */
export interface RoleClsf {
  /** 코드V20 · PK */
  roleClsfCd: string;
  /** 명V50 */
  roleClsfNm: string;
  indctSeqno: number;
}
