/** 전 화면 라우트 상수/빌더 — 경로 문자열을 화면에 직접 적지 않고 이 파일만 참조한다 */
export const ROUTES = {
  /** 행사 목록 — 공개 앱의 첫 화면이다 */
  events: "/",
  eventDetail: (eventId: number) => `/events/${eventId}`,
  /**
   * 행사 참가 신청 (#154 · wave2 D2·D15).
   *
   * 로그인 → (미가입이면) 간편 가입 → 폼 작성이 **이 한 주소 안에서** 이어진다. 단계마다 화면을
   * 나누지 않는 것은 §8-4의 요구다 — 네 단계로 갈라 두면 리다이렉트 왕복마다 이탈이 생기고,
   * 돌아올 곳을 단계 수만큼 관리해야 한다.
   */
  eventApply: (eventId: number) => `/events/${eventId}/apply`,
  /** 내 신청 현황 (#150 · wave2 D10) */
  myApplications: "/my-applications",
  /**
   * 공개 폼 — 링크를 아는 회원이 답을 내는 화면 (ssccops#214에서 어드민에서 옮겨 왔다).
   *
   * **'공개'는 익명이라는 뜻이 아니다.** 주소를 아는 사람은 누구나 열 수 있지만 답을 내려면
   * 회원이어야 한다(응답자는 전원 회원이다 — `form_rspns_hstry.mbr_id` NOT NULL). 그래서
   * 이 화면도 로그인·가입을 화면 안에서 잇는다(행사 신청과 같은 모양이다).
   *
   * 행사 신청(`eventApply`)과 갈리는 지점은 **행사에 딸리지 않은 폼**이라는 것이다 — 돌아갈
   * 행사가 없고, 여러 건을 받는 폼일 수 있다.
   */
  publicForm: (formId: number) => `/f/${formId}`,
  publicFormDone: (formId: number) => `/f/${formId}/done`,
  /**
   * 내가 낸 응답 한 건 — 수정 요청 사유를 읽고 다시 내는 자리 (ssccops#221).
   *
   * `publicForm`(새로 내기)과 **다른 화면이다.** 한 주소에 두 뜻을 담으면 새 응답을 막는
   * 상태(`alreadySubmitted` — 수정 요청도 포함된다)가 작성 폼을 닫는 것과 재제출이 열려야
   * 하는 것이 같은 자리에서 부딪힌다.
   */
  myFormResponse: (formId: number, formRspnsId: number) =>
    `/f/${formId}/responses/${formRspnsId}`,
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
 * 어드민(가입·연결 화면이 있는 앱)의 오리진.
 *
 * **간편 가입 자체는 이제 이 앱 안에서 한다**(#154 — 신청 흐름에 임베드). 이 링크가 남은
 * 자리는 **하나뿐이다** — 행사 없이 열린 '내 신청'의 가입 안내다(신청 흐름에 태울 행사가 없어
 * 폼을 그 자리에 세울 수 없다).
 *
 * 기존 회원 연결도 여기서 쓰던 자리였으나 **그 연결은 신청 흐름 안에서 끝난다**(#364 ·
 * `features/signup/ui/member-link-step.tsx`). 어드민의 연결 화면(`/signup/link`)은 그대로
 * 있지만 이 앱이 그리로 넘기지 않는다 — 명부에 있는 사람만 "다른 화면으로 이동하지 않습니다"
 * 라는 약속에서 빠지던 자리였고, 그 화면이 이 값에 기대면 값이 비었을 때 갈 곳이 없어진다.
 *
 * 값이 비어 있으면 링크 없이 문구만 안내한다 — 없는 화면으로 보내지 않기 위한 기본값이다.
 */
export function signupUrl(): string | null {
  const origin = process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.replace(/\/+$/, "");
  return origin ? `${origin}/signup` : null;
}
