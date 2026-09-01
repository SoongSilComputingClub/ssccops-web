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
   * 폼 템플릿 (#134). 폼 아래에 두는 것은 템플릿이 폼의 문항 구성을 재사용하기 위한 것이고
   * 서버 인가도 폼과 같은 권한(FORM_WRITE)이기 때문이다.
   *
   * 상세 화면은 두지 않는다 — 목록에서 이름을 누르면 곧장 편집이다. 템플릿에는 상태 전이도
   * 응답도 없어 "읽기만 하는 화면"이 이름·설명·문항을 다시 보여 주는 것 말고 할 일이 없다.
   */
  formTemplates: "/forms/templates",
  formTemplateNew: "/forms/templates/new",
  formTemplateEdit: (formTmplId: number) => `/forms/templates/${formTmplId}/edit`,

  /*
   * 행사 관리 (#136). 상세 화면이 따로 없다 — 목록에서 제목을 누르면 곧장 수정 화면이다.
   * 게시·보관 전이와 삭제도 수정 화면에서 한다(행사 정보와 전이 버튼이 같은 것을 보게).
   */
  events: "/events",
  eventNew: "/events/new",
  eventEdit: (eventId: number) => `/events/${eventId}/edit`,
  /**
   * 신청 심사·참가자 명단 (#145).
   *
   * 수정 화면 안의 탭이 아니라 **별도 주소**다. 수정은 저장하지 않은 입력을 쥔 폼이고
   * 이쪽은 목록을 오가며 심사·등록을 반복하는 화면이라, 한 화면에 두면 탭을 옮길 때마다
   * 작성 중인 행사 정보가 사라지거나 반대로 심사가 편집 상태에 갇힌다. 주소가 갈려 있으면
   * "이 행사 신청자 좀 봐줘"를 링크 하나로 넘길 수도 있다(응답 목록과 같은 판단).
   */
  eventParticipants: (eventId: number) => `/events/${eventId}/participants`,
  eventCategories: "/events/categories",

  my: "/my",

  publicForm: (formId: number) => `/f/${formId}`,
  publicFormDone: (formId: number) => `/f/${formId}/done`,

  /*
   * 기획안 검토 (#164) — 학술국장이 남이 낸 기획안을 승인·수정요청·반려하는 화면.
   *
   * **회원이 기획안을 내는 화면은 이 앱에 없다** (#231). 예전에는 `/proposals`가 그 자리였는데
   * `apps/lms`로 옮겨 갔고(#185) 이 앱에는 검토 화면만 남았다 — 운영 화면이라 사이드바 아래
   * (`app/(admin)`)에 산다. 주소가 `/proposals/review`인 것은 그 시절의 흔적이며, 지금은 이
   * 접두사 아래에 회원용 화면이 없다.
   *
   * 여기에도 폼 번호가 없다. 기획안 폼은 코드(`sys_form_cd = 'PROPOSAL'`)가 가리키는 시스템
   * 폼이고 번호는 환경마다 다르다 — 주소에 실으면 그 링크는 한 환경에서만 산다. 대신 상세는
   * **응답 번호**를 싣는다. 그것은 IDENTITY지만 환경을 넘겨 공유할 값이 아니라 같은 환경 안에서
   * "이 기획안 좀 봐줘"를 링크로 넘기는 값이다(응답 상세와 같은 판단).
   */
  proposalReviews: "/proposals/review",
  proposalReviewDetail: (formRspnsId: number) => `/proposals/review/${formRspnsId}`,

  /*
   * 학술 활동 (#122 · 서버 #130·#131·#133·#134·#136·#150).
   *
   * 화면은 후속 이슈가 붙인다 — 이 이슈는 entities `api`/`model` 계층과 라우트 상수만
   * 만든다. 활동은 기획안(PROPOSAL 시스템 폼) 승인 시 서버가 이관해 만들므로 '활동 등록'
   * 주소가 없다(#122 — 프로토타입 헤더의 `+ 활동 등록`은 이 결정 이전 시안이라 따르지 않는다).
   *
   * 상세만 IDENTITY(활동 번호)를 싣는다. 나머지는 활동 횡단 운영 화면이다 — 모집 감독
   * (recruitment), 회차 승인 대기 목록(reviews/sessions), 회차 이력(sessions), 출석 관리
   * (attendance). 공개 앱(apps/lms)의 `/studio` 계열 주소는 그 앱이 생긴 뒤 후속 이슈가
   * 그쪽 routes.ts에 붙인다 — 두 앱은 소스를 공유하지 않는다.
   */
  academicPrograms: "/academic-programs",
  academicProgramDetail: (academicProgramId: number) =>
    `/academic-programs/${academicProgramId}`,
  /**
   * 학술국장 대시보드 (#126). 학술 그룹의 첫 화면 — 전체 활동 현황·이번 주 회차·승인 대기.
   *
   * 공개 앱(apps/lms)의 `/studio`와 이름은 "학술 대시보드"로 같지만 앱도 데이터도 다르다
   * (국장은 전체 감독, 스터디장은 본인 활동 1건). 두 앱은 소스를 공유하지 않는다.
   */
  academicProgramDashboard: "/academic-programs/dashboard",
  academicProgramRecruitment: "/academic-programs/recruitment",
  academicProgramSessionReviews: "/academic-programs/reviews/sessions",
  academicProgramSessions: "/academic-programs/sessions",
  /**
   * 회차 상세 (#130). 회차 이력에서 회차 한 줄을 열면 온다.
   *
   * 활동 번호를 함께 싣는다 — 회차 상세·출석부·승인 이력 조회가 모두
   * `/v1/academic-programs/{academicProgramId}/...` 경로라 활동 번호 없이는 부를 수 없다
   * (회차 이력 응답 SessionCrossListItem 이 두 값을 함께 준다).
   */
  academicProgramSessionDetail: (
    academicProgramId: number,
    sessionId: number,
  ) => `/academic-programs/sessions/${academicProgramId}/${sessionId}`,
  academicProgramAttendance: "/academic-programs/attendance",
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
