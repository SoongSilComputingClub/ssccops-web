/** 전 화면 라우트 상수/빌더 — 뷰·기능 전반에서 이 파일만 참조 */
export const ROUTES = {
  login: "/login",
  signup: "/signup",
  /**
   * 기존(이관) 회원 계정 연결 (#58).
   *
   * 가입 폼 안의 모드가 아니라 **별도 주소**인 것은 두 화면이 서로 다른 일을 하기 때문이다 —
   * 한쪽은 회원을 새로 만들고 다른 쪽은 이미 있는 회원에 계정을 붙인다. 한 폼에 섞으면
   * 사용자는 자기가 무엇을 눌렀는지 모르고, 잘못 고르면 명부에 같은 사람이 두 줄이 된다.
   */
  signupLink: "/signup/link",
  signupComplete: "/signup/complete",

  dashboard: "/dashboard",
  operations: "/operations",
  works: "/operations/works",
  workDetail: (workId: number) => `/operations/works/${workId}`,
  workEdit: (workId: number) => `/operations/works/${workId}/edit`,
  subWorks: "/operations/sub-works",
  subWorkDetail: (subWorkId: number) => `/operations/sub-works/${subWorkId}`,
  subWorkEdit: (subWorkId: number) => `/operations/sub-works/${subWorkId}/edit`,
  meetings: "/operations/meetings",
  meetingDetail: (mtgId: number) => `/operations/meetings/${mtgId}`,
  operationNew: "/operations/new",
  subWorkTypes: "/operations/types",
  approvals: "/approvals",

  members: "/members",
  memberNew: "/members/new",
  memberDetail: (mbrId: number) => `/members/${mbrId}`,
  memberEdit: (mbrId: number) => `/members/${mbrId}/edit`,
  /**
   * 회원 변경 이력 (#51) — 등급 · 상태 · 역할 변경만 담긴다.
   *
   * 이름이 `memberHistories`이지 `memberAuditLog`가 아닌 것은 담기는 것이 세 이력 테이블뿐이고
   * 회원 정보(이름·연락처·학과) 수정은 어디에도 쌓이지 않기 때문이다 (views/member-history).
   */
  memberHistories: (mbrId: number) => `/members/${mbrId}/histories`,
  roles: "/members/roles",
  roleNew: "/members/roles/new",
  roleEdit: (roleId: number) => `/members/roles/${roleId}/edit`,
  /** 역할별 권한 부여 (#32) */
  roleAuthorities: (roleId: number) => `/members/roles/${roleId}/authorities`,
  /** 권한 트리 관리 (#32) */
  authorities: "/members/authorities",
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

  /*
   * 행사 관리 (#136). 상세 화면이 따로 없다 — 목록에서 제목을 누르면 곧장 수정 화면이다.
   * 게시·보관 전이와 삭제도 수정 화면에서 한다(행사 정보와 전이 버튼이 같은 것을 보게).
   */
  events: "/events",
  eventNew: "/events/new",
  eventEdit: (eventId: number) => `/events/${eventId}/edit`,
  eventCategories: "/events/categories",

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
