/**
 * 학술 공개 앱 라우트 상수/빌더 (#169) — 경로 문자열을 화면에 직접 적지 않고 이 파일만 참조한다.
 *
 * 프로토타입(`private-workspace/학술관리 시스템 UI.html`)의 주소를 그대로 옮긴다. 화면은 후속
 * 이슈가 붙이므로 지금은 상수만 둔다 — 어드민 `routes.ts`가 학술 화면 없이 상수부터 둔 것과
 * 같은 방식이다. 두 앱은 소스를 공유하지 않으므로 어드민의 `/academic-programs` 계열 주소와
 * 겹치지 않는다.
 */
export const ROUTES = {
  /**
   * 첫 화면 — 갈 곳을 고르는 자리 (#226).
   *
   * 전에는 루트가 `/studio`로 곧장 넘겼지만(#169), 상단 바가 역할별로 갈리고 나서(#224) 일반
   * 회원에게는 첫 화면이 "학술 대시보드" 제목 아래 빈 상태만 뜨는 꼴이 됐다. 지금은 대시보드와
   * 기획안 제출 두 카드를 그리고, **스터디장은 `/studio`로 곧장 넘긴다**(페이지의 redirect).
   */
  home: "/",
  /**
   * 학술 대시보드 — 스터디장의 홈.
   *
   * `/studio`가 스터디장·회원이 자기 활동을 보는 홈이다(프로토타입의 좌측 알약 = lms.sscc.co.kr).
   * 어드민의 `/academic-programs`(학술국장이 전체를 감독)와 하는 일이 반대다 — 주소를 갈라 둔
   * 것도 그래서다.
   */
  studio: "/studio",
  /**
   * 내 활동 목록 — 내가 스터디장/팀장인 활동들 (#188).
   *
   * 대시보드(`/studio`)가 "지금 굴러가는 활동 하나"라면 이 화면은 "내가 맡은 활동 전부"다.
   * 상단 바의 "내 활동"이 이 주소를 가리킨다(그전에는 `/studio`로 걸려 대시보드와 같은
   * 화면이 떴다). 여러 활동을 맡지 않은 회원에게는 빈 상태를 그린다.
   */
  studioPrograms: "/studio/programs",
  /**
   * 활동 하나의 상세 — 커리큘럼 대비 진행·회차 이력·출석 요약 (#188).
   *
   * 활동 식별자(`programId`)만 경로에 싣는다. `/studio/programs`의 카드에서 들어오고,
   * 대시보드의 활동 카드도 이 주소로 이을 수 있다.
   */
  studioProgramDetail: "/studio/programs/[programId]",
  /**
   * 회차 기록 — 스터디장이 진행한 회차를 적는다 (#128).
   *
   * 대상은 주소의 `?programId=`(활동)와 `?curriculumItemId=`(그 활동의 커리큘럼 항목)로 받는다
   * — 스터디장이 여러 활동·여러 회차를 맡으므로 주소에 실린다. 대시보드·활동 상세가 회차별로
   * 이 링크를 건다. 값 없이(상단 바 메뉴) 들어오면 화면이 활동 → 회차 선택으로 안내한다
   * (활동을 하나만 맡았으면 자동, 여럿이면 고르게 · #190 · 임의로 하나를 고르지 않는다).
   */
  studioRecord: "/studio/record",
  /** 출석부 — 스터디장이 회차별 출석을 확인·기록한다 */
  studioRoster: "/studio/roster",
  /** 팀원 관리 — 스터디장이 팀원 목록을 본다 */
  studioMembers: "/studio/members",
  /**
   * 기획안 제출 (일반회원).
   *
   * **주소에 폼 번호가 없다.** 기획안 폼은 코드(`sys_form_cd = 'PROPOSAL'`)가 가리키는 시스템
   * 폼이고 번호는 환경마다 다르므로, 주소에 실으면 그 링크는 한 환경에서만 산다 — 어드민
   * `/proposals/new`와 같은 판단이다. 화면이 진입할 때 코드로 폼을 찾는다.
   */
  proposalNew: "/proposals/new",
  /** 기획안 제출 현황 — 회원이 자기가 낸 기획안의 상태를 본다 */
  myApplications: "/my/applications",
  /**
   * 기획안 한 건의 상세 — 검토 이력·수정요청 사유와, 수정요청받은 건이면 재제출 폼 (#171).
   *
   * 카드에서 이 주소로 들어온다. 응답 식별자(`formRspnsId`)만 경로에 싣는다 — 폼 번호는 화면이
   * 진입할 때 코드(`sys_form_cd = 'PROPOSAL'`)로 찾으므로 주소에 없다.
   */
  myApplicationDetail: "/my/applications/[formRspnsId]",
  /**
   * OAuth 콜백 라우트 핸들러. Supabase 대시보드의 Redirect URLs에 `<오리진>${authCallback}`을
   * 등록해야 로그인이 이 앱으로 돌아온다 — 등록이 없으면 Site URL(어드민)로 조용히 넘어간다
   * (어드민이 ssccops#84로 실제로 밟은 함정이고, 오리진이 셋으로 늘어 다시 밟기 쉽다).
   */
  authCallback: "/auth/callback",
} as const;

/** 로그인 실패 사유를 화면까지 나르는 쿼리 키 (app/auth/callback/route.ts 참고) */
export const LOGIN_ERROR_QUERY = "login_error";

/**
 * 회차 기록 화면 링크 — `?programId=&curriculumItemId=`를 붙인다 (#128).
 *
 * 경로 문자열을 화면에 직접 조립하지 않는다. 대시보드·활동 상세가 회차별로 이 빌더를 쓴다.
 */
export function studioRecordUrl(academicProgramId: number, curriculumItemId: number): string {
  return `${ROUTES.studioRecord}?programId=${academicProgramId}&curriculumItemId=${curriculumItemId}`;
}

/**
 * 회차 기록 화면 링크 — 활동만 정하고 회차는 화면에서 고르게 한다 (#190).
 *
 * 활동을 여러 개 맡은 스터디장이 활동을 먼저 고른 뒤, 그 활동의 커리큘럼 항목 목록에서
 * 회차를 고른다. `curriculumItemId`는 그 목록이 붙인다.
 */
export function studioRecordProgramUrl(academicProgramId: number): string {
  return `${ROUTES.studioRecord}?programId=${academicProgramId}`;
}

/**
 * 기획안 상세 링크 — `/my/applications/{formRspnsId}` (#171).
 *
 * 경로 문자열을 화면에 직접 조립하지 않는다. 제출 현황의 카드가 이 빌더를 쓴다.
 */
export function myApplicationDetailUrl(formRspnsId: number): string {
  return `${ROUTES.myApplications}/${formRspnsId}`;
}

/**
 * 활동 상세 링크 — `/studio/programs/{programId}` (#188).
 *
 * 경로 문자열을 화면에 직접 조립하지 않는다. 내 활동 목록의 카드·대시보드의 활동 카드가
 * 이 빌더를 쓴다.
 */
export function studioProgramDetailUrl(academicProgramId: number): string {
  return `${ROUTES.studioPrograms}/${academicProgramId}`;
}

/**
 * 출석부 화면 링크 — `?programId=`를 붙인다 (#172).
 *
 * 경로 문자열을 화면에 직접 조립하지 않는다. 대시보드·활동 상세가 활동별로 이 빌더를 쓴다.
 * 상단 바 메뉴(`_shell/nav-links.ts`)는 활동을 특정하지 못하므로 `ROUTES.studioRoster`만
 * 걸고, 화면이 `programId` 없이 열리면 대시보드로 안내한다(#131·#128과 같은 태도).
 */
export function studioRosterUrl(academicProgramId: number): string {
  return `${ROUTES.studioRoster}?programId=${academicProgramId}`;
}

/**
 * 팀원 관리 화면 링크 — `?programId=`를 붙인다 (#131 · #190).
 *
 * 경로 문자열을 화면에 직접 조립하지 않는다. 내 활동 상세·활동 선택 목록이 이 빌더를 쓴다.
 */
export function studioMembersUrl(academicProgramId: number): string {
  return `${ROUTES.studioMembers}?programId=${academicProgramId}`;
}

/**
 * 어드민(가입 화면이 있는 앱)의 오리진.
 *
 * 학술 공개 앱에는 **신청(참여) 흐름이 없다** — 참여 신청은 시스템 폼으로 처리하기로 2026-08-28
 * 확정됐고 신청 화면을 학술 쪽에 따로 만들지 않는다(#169). 그래서 apps/www처럼 간편 가입 폼을
 * 임베드하지 않고, 미가입(`SIGNUP_REQUIRED`) 사용자는 이 오리진의 `/signup`으로 보낸다.
 *
 * 값이 비어 있으면 링크 없이 문구만 안내한다 — 없는 화면으로 보내지 않기 위한 기본값이다.
 */
export function signupUrl(): string | null {
  const origin = process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.replace(/\/+$/, "");
  return origin ? `${origin}/signup` : null;
}
