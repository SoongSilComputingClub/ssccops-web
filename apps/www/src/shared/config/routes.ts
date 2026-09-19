/** 전 화면 라우트 상수/빌더 — 경로 문자열을 화면에 직접 적지 않고 이 파일만 참조한다 */
export const ROUTES = {
  /**
   * 홈 — «지금 SSCC» (#524 · ssccops#385). 배너 · hero · 다가오는 일정 · 소개 · 최근 활동.
   *
   * 행사 목록이 첫 화면이던 자리다(#141 · wave2 D1). 홈이 세션과 무관한 익명 화면인 것은 그대로다.
   */
  home: "/",
  /**
   * 행사 목록 — 홈에서 이사했다(#524). 열리는 행사는 홈의 «다가오는 일정»이 세 건까지 보여 주고,
   * 전체 목록(분류 칩 포함)은 여기다. 상단 바에서는 «활동» 축이 켜진다.
   */
  events: "/events",
  eventDetail: (eventId: number) => `/events/${eventId}`,
  /**
   * 행사 참가 신청 (#154 · wave2 D2·D15).
   *
   * 로그인 → (미가입이면) 간편 가입 → 폼 작성이 **이 한 주소 안에서** 이어진다. 단계마다 화면을
   * 나누지 않는 것은 §8-4의 요구다 — 네 단계로 갈라 두면 리다이렉트 왕복마다 이탈이 생기고,
   * 돌아올 곳을 단계 수만큼 관리해야 한다.
   */
  eventApply: (eventId: number) => `/events/${eventId}/apply`,
  /**
   * 내 활동 — 신청한 행사·낸 폼·내가 이끄는 스터디·프로젝트 한 화면 (#518 · ssccops#386).
   *
   * `/my-applications`(#150 · wave2 D10)가 여기로 이사했다. 옛 주소는 `next.config.ts`의 정적
   * redirect가 받는다 — 이미 뿌린 링크·북마크가 있고, 401·403 규칙과 무관한 주소 이동이라 화면이
   * 아니라 설정이 맡는다.
   */
  me: "/me",
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
  // 폼 주소의 식별자는 키(UUID) 또는 숫자 — 화면은 formKey가 있으면 그것으로 만든다 (ADR-0036)
  publicForm: (formRef: string | number) => `/f/${formRef}`,
  publicFormDone: (formRef: string | number) => `/f/${formRef}/done`,
  /**
   * 내가 낸 응답 한 건 — 수정 요청 사유를 읽고 다시 내는 자리 (ssccops#221).
   *
   * `publicForm`(새로 내기)과 **다른 화면이다.** 한 주소에 두 뜻을 담으면 새 응답을 막는
   * 상태(`alreadySubmitted` — 수정 요청도 포함된다)가 작성 폼을 닫는 것과 재제출이 열려야
   * 하는 것이 같은 자리에서 부딪힌다.
   */
  myFormResponse: (formRef: string | number, formRspnsId: number) =>
    `/f/${formRef}/responses/${formRspnsId}`,
  /**
   * OAuth 콜백 라우트 핸들러. Supabase 대시보드의 Redirect URLs에 `<오리진>${authCallback}`을
   * 등록해야 로그인이 이 앱으로 돌아온다 — 등록이 없으면 Site URL(어드민)로 조용히 넘어간다.
   */
  authCallback: "/auth/callback",

  /*
   * 다섯 축 (#520 · ssccops#382) — SSCC · 운영진 · 활동 · 모집 · 문의.
   *
   * 페이지 경로는 서버의 게시된 페이지(`cntnt_page`) 한 장을 그린다 — 어느 슬러그인지는
   * `content-slugs.ts`의 표가 정한다. 포스트 경로는 `cntnt_post`의 목록·상세다.
   */
  /** 소개 */
  about: "/about",
  /** 연혁 */
  aboutHistory: "/about/history",
  /** 핵심 가치 */
  aboutValues: "/about/values",
  /** 지금 운영진 */
  operators: "/operators",
  /** 역대 운영진 한 기수 */
  operatorsCohort: (cohort: string | number) => `/operators/${cohort}`,
  /** 지원 안내 — 접수 중인 폼 목록을 함께 그린다 */
  join: "/join",
  /** 자주 묻는 질문 */
  joinFaq: "/join/faq",
  /** 지난 모집 */
  joinHistory: "/join/history",
  /** 개인정보처리방침 */
  privacy: "/privacy",
  /** 사진 게재 안내 */
  photoNotice: "/photo-notice",
  /** 이용약관 */
  terms: "/terms",
  /** 활동 아카이브 — 게시된 포스트 전체 */
  activities: "/activities",
  /** 한 분류의 포스트 목록 — `categorySlug`는 `entities/content`의 분류 표(`academic`·`event`·`news`) */
  activitiesCategory: (categorySlug: string) => `/activities/${categorySlug}`,
  /** 포스트 상세 */
  activitiesPost: (categorySlug: string, slug: string) => `/activities/${categorySlug}/${slug}`,
  /**
   * 학기별 묶음 — `/activities/2026/1`. 1학기는 3~8월, 2학기는 9월~이듬해 2월
   * (`entities/content`의 `semesterRange`).
   */
  activitiesSemester: (year: number, semester: 1 | 2) => `/activities/${year}/${semester}`,
  /**
   * 문의 — 페이지 `contact`(게시돼 있으면) + 문의처 블록 (#524).
   *
   * #520에서는 화면 없이 푸터의 문의 블록(`#contact`)으로 내려가는 앵커였다. 상단 바 항목이
   * 앵커면 어느 화면에서 눌러도 «켜지지» 않고 공유할 주소도 없어 화면으로 올렸다. 푸터의 블록은
   * 그대로 남는다 — 지원자가 어느 화면에서 멈춰도 다음 행동이 있게 하는 자리라서다.
   */
  contact: "/contact",
} as const;

/** 아카이브 목록의 커서 쿼리 키 — «더 보기»가 다음 페이지를 주소에 싣는다 */
export const CURSOR_QUERY = "cursor";

/**
 * 커서를 실은 아카이브 목록 주소.
 *
 * «더 보기»를 버튼이 아니라 링크로 두는 이유는 행사 목록의 분류 칩과 같다 — 목록 화면이 서버
 * 컴포넌트로 남고, 다음 페이지가 주소에 있어 공유·뒤로 가기가 말이 된다. 커서가 없으면 쿼리를
 * 붙이지 않는다(첫 페이지가 두 주소를 갖지 않게).
 */
export function activitiesPath(categorySlug: string | null, cursor?: string | null): string {
  const base = categorySlug ? ROUTES.activitiesCategory(categorySlug) : ROUTES.activities;
  return cursor ? `${base}?${CURSOR_QUERY}=${encodeURIComponent(cursor)}` : base;
}

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

/*
 * 어드민 오리진(`NEXT_PUBLIC_ADMIN_ORIGIN` · `signupUrl()`)은 #451에서 걷어냈다 — 마지막 남은
 * 사용처였던 '내 신청'의 가입 안내가 이제 같은 자리에서 `SignupStep`을 연다. 이 앱이 아는 남의
 * 오리진은 lms(`lms-routes.ts`) 하나다. 부원에게 나가는 화면이 운영 도메인을 가리키지 않는다.
 */
