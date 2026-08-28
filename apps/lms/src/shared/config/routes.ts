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
   * 학술 대시보드 — 이 앱의 첫 화면이다.
   *
   * `/studio`가 스터디장·회원이 자기 활동을 보는 홈이다(프로토타입의 좌측 알약 = lms.sscc.co.kr).
   * 어드민의 `/academic-programs`(학술국장이 전체를 감독)와 하는 일이 반대다 — 주소를 갈라 둔
   * 것도 그래서다.
   */
  studio: "/studio",
  /** 회차 기록 — 스터디장이 진행한 회차를 적는다 */
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
   * OAuth 콜백 라우트 핸들러. Supabase 대시보드의 Redirect URLs에 `<오리진>${authCallback}`을
   * 등록해야 로그인이 이 앱으로 돌아온다 — 등록이 없으면 Site URL(어드민)로 조용히 넘어간다
   * (어드민이 ssccops#84로 실제로 밟은 함정이고, 오리진이 셋으로 늘어 다시 밟기 쉽다).
   */
  authCallback: "/auth/callback",
} as const;

/** 로그인 실패 사유를 화면까지 나르는 쿼리 키 (app/auth/callback/route.ts 참고) */
export const LOGIN_ERROR_QUERY = "login_error";

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
