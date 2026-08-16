/*
 * 역할 엔티티.
 *
 * 목 스토어(`model/store.ts`)와 시드(`api/get-role*.json`), 그리고 그것이 쓰던 시드 타입
 * (`Role`·`RoleClsf`)은 #54에서 지웠다 — 역할 목록·수정·분류 관리는 전부 서버 계약 위에서 돈다.
 */
export {
  ROLE_CLASSIFICATION_ERROR,
  ROLE_CLSF_CD_PATTERN,
  ROLE_CLSF_NM_MAX_LENGTH,
  SYSTEM_ROLE_CLSF_CD,
  createRoleClassification,
  deleteRoleClassification,
  fetchRoleClassifications,
  updateRoleClassification,
} from "./api/role-classifications";
export type {
  RoleClassification,
  RoleClassificationCreateInput,
} from "./api/role-classifications";
export {
  ROLE_ERROR,
  ROLE_NM_MAX_LENGTH,
  createRole,
  deleteRole,
  fetchRole,
  fetchRoles,
  updateRole,
} from "./api/roles";
export type {
  RoleCreateInput,
  RoleDetail,
  RoleMember,
  RoleSummary,
  RoleUpdateInput,
} from "./api/roles";
