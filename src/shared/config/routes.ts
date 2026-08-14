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

/**
 * 공개 폼의 절대 URL — 운영진이 복사해 외부에 뿌리는 값이라 상대 경로로는 쓸 수 없다.
 *
 * 예전에는 화면에 `https://form.sscc.kr`이 박혀 있었다. 배포 도메인이 그와 다르면 복사한
 * 링크가 그대로 죽는데, 화면에는 멀쩡한 주소로 보이므로 알아채기까지 오래 걸린다.
 * 그래서 오리진은 배포별 환경변수(NEXT_PUBLIC_PUBLIC_FORM_ORIGIN)로 뺐다.
 *
 * 값이 없으면 지금 접속한 오리진으로 떨어진다 — 공개 폼(/f/{formId})은 이 앱이 직접 서빙하므로
 * 로컬·프리뷰에서는 그 편이 맞고, 무엇보다 죽은 도메인을 복사해 주는 것보다 낫다.
 */
export function publicFormUrl(formId: number): string {
  const configured = process.env.NEXT_PUBLIC_PUBLIC_FORM_ORIGIN;
  const origin = configured
    ? configured.replace(/\/+$/, "")
    : typeof window === "undefined"
      ? ""
      : window.location.origin;
  return `${origin}${ROUTES.publicForm(formId)}`;
}
