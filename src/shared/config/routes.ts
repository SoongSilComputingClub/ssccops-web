/** 전 화면 라우트 상수/빌더 — 뷰·기능 전반에서 이 파일만 참조 */
export const ROUTES = {
  login: "/login",
  signup: "/signup",
  signupComplete: "/signup/complete",

  dashboard: "/dashboard",
  operations: "/operations",
  works: "/operations/works",
  workDetail: (workId: number) => `/operations/works/${workId}`,
  subWorks: "/operations/sub-works",
  subWorkDetail: (subWorkId: number) => `/operations/sub-works/${subWorkId}`,
  meetings: "/operations/meetings",
  meetingDetail: (mtgId: number) => `/operations/meetings/${mtgId}`,
  operationNew: "/operations/new",
  subWorkTypes: "/operations/types",
  approvals: "/approvals",

  members: "/members",
  memberNew: "/members/new",
  memberDetail: (mbrId: number) => `/members/${mbrId}`,
  memberEdit: (mbrId: number) => `/members/${mbrId}/edit`,
  roles: "/members/roles",
  roleNew: "/members/roles/new",
  roleEdit: (roleId: number) => `/members/roles/${roleId}/edit`,
  roleLabels: "/members/role-labels",
  csvImport: "/members/csv-import",

  forms: "/forms",
  formNew: "/forms/new",
  formDetail: (formId: number) => `/forms/${formId}`,
  formEdit: (formId: number) => `/forms/${formId}/edit`,
  responses: (formId: number) => `/forms/${formId}/responses`,
  responseDetail: (formId: number, formRspnsId: number) =>
    `/forms/${formId}/responses/${formRspnsId}`,
  formLabels: "/forms/labels",

  my: "/my",

  publicForm: (formId: number) => `/f/${formId}`,
  publicFormDone: (formId: number) => `/f/${formId}/done`,
} as const;
