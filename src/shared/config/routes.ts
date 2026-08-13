/** 전 화면 라우트 상수/빌더 — 뷰·기능 전반에서 이 파일만 참조 */
export const ROUTES = {
  login: "/login",
  signup: "/signup",
  signupComplete: "/signup/complete",

  dashboard: "/dashboard",
  operations: "/operations",
  works: "/operations/works",
  workDetail: (workId: string) => `/operations/works/${workId}`,
  subWorks: "/operations/sub-works",
  taskDetail: (taskId: string) => `/operations/sub-works/${taskId}`,
  meetings: "/operations/meetings",
  meetingDetail: (meetingId: string) => `/operations/meetings/${meetingId}`,
  operationNew: "/operations/new",
  opTypes: "/operations/types",
  approvals: "/approvals",

  members: "/members",
  memberNew: "/members/new",
  memberDetail: (memberKey: string) => `/members/${memberKey}`,
  memberEdit: (memberKey: string) => `/members/${memberKey}/edit`,
  roles: "/members/roles",
  roleNew: "/members/roles/new",
  roleEdit: (roleId: string) => `/members/roles/${roleId}/edit`,
  roleLabels: "/members/role-labels",
  csvImport: "/members/csv-import",

  forms: "/forms",
  formNew: "/forms/new",
  formDetail: (formKey: string) => `/forms/${formKey}`,
  formEdit: (formKey: string) => `/forms/${formKey}/edit`,
  responses: (formKey: string) => `/forms/${formKey}/responses`,
  responseDetail: (formKey: string, responseId: string) =>
    `/forms/${formKey}/responses/${responseId}`,
  formLabels: "/forms/labels",

  my: "/my",

  publicForm: (slug: string) => `/f/${slug}`,
  publicFormDone: (slug: string) => `/f/${slug}/done`,
} as const;
