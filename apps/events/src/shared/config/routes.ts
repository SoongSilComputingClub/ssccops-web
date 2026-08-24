/** 전 화면 라우트 상수/빌더 — 경로 문자열을 화면에 직접 적지 않고 이 파일만 참조한다 */
export const ROUTES = {
  /** 행사 목록 — 공개 앱의 첫 화면이다 */
  events: "/",
  eventDetail: (eventId: number) => `/events/${eventId}`,
  /** 내 신청 현황 — 이 앱에서 로그인이 필요한 **유일한** 화면이다 (#150 · wave2 D10) */
  myApplications: "/my-applications",
  /**
   * OAuth 콜백 라우트 핸들러. Supabase 대시보드의 Redirect URLs에 `<오리진>${authCallback}`을
   * 등록해야 로그인이 이 앱으로 돌아온다 — 등록이 없으면 Site URL(어드민)로 조용히 넘어간다.
   */
  authCallback: "/auth/callback",
} as const;

/**
 * 분류 필터를 쿼리로 실은 목록 주소.
 *
 * 필터를 URL에 두는 것은 공유·뒤로 가기 때문이다 — 칩을 누른 상태 그대로 링크를 보낼 수 있고,
 * 상세를 봤다가 돌아와도 고르던 분류가 남는다. 값이 없으면 쿼리를 아예 붙이지 않는다
 * (`/?clsf=`처럼 빈 값이 남으면 '전체'가 두 가지 주소를 갖는다).
 */
export function eventsPath(eventClsfCd?: string | null): string {
  return eventClsfCd
    ? `${ROUTES.events}?${EVENT_CLSF_QUERY}=${encodeURIComponent(eventClsfCd)}`
    : ROUTES.events;
}

/** 목록의 분류 필터 쿼리 키 */
export const EVENT_CLSF_QUERY = "clsf";

/** 로그인 실패 사유를 '내 신청' 화면까지 나르는 쿼리 키 (app/auth/callback/route.ts 참고) */
export const LOGIN_ERROR_QUERY = "login_error";

/**
 * 가입 안내가 가리킬 곳 — 어드민(가입 화면이 있는 앱)의 오리진.
 *
 * 이 앱에는 가입 폼이 없다(#150 범위 밖). 값이 비어 있으면 링크 없이 문구만 안내한다 —
 * 없는 화면으로 보내거나, 가입할 곳이 없는 앱 안에서 리다이렉트를 돌리지 않기 위해서다.
 */
export function signupUrl(): string | null {
  const origin = process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.replace(/\/+$/, "");
  return origin ? `${origin}/signup` : null;
}
