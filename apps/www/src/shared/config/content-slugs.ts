/*
 * 콘텐츠 페이지 슬러그 — 화면 경로와 서버 `cntnt_page.slug`를 잇는 표 (#520 · ssccops#382).
 *
 * 경로마다 어느 슬러그를 읽는지는 **이 파일 한 곳**에만 적는다. 어드민에서 페이지를 만들 때
 * 홍보국이 이 표의 슬러그를 그대로 쓰고, www는 그 슬러그를 `GET /public/v1/pages/{slug}`로
 * 읽는다. 표에 없는 슬러그로 게시된 페이지는 어디에도 나타나지 않고, 표에는 있는데 게시본이
 * 없으면 화면이 «준비 중» 한 줄을 그린다(404가 아니다 — ssccops#382 수용 기준).
 *
 * 슬러그 모양은 서버 `ContentSlug`(소문자·숫자·하이픈 · 80자 이하)를 따른다.
 */
export const CONTENT_SLUG = {
  /** `/about` — 소개 */
  about: "about",
  /** `/about/history` — 연혁. 본문의 `## 연도` + 목록을 타임라인 CSS가 그린다 */
  history: "history",
  /** `/about/values` — 핵심 가치 */
  values: "values",
  /** `/operators` — 지금 운영진(기수를 주소에 적지 않는 현재 표) */
  operators: "operators",
  /** `/join` — 지원 안내 */
  join: "join",
  /** `/join/faq` — 자주 묻는 질문 */
  joinFaq: "join-faq",
  /** `/join/history` — 지난 모집 */
  joinHistory: "join-history",
  /** `/privacy` — 개인정보처리방침 */
  privacy: "privacy",
  /** `/photo-notice` — 사진 게재 안내 */
  photoNotice: "photo-notice",
  /** `/terms` — 이용약관 */
  terms: "terms",
} as const;

export type ContentSlug = (typeof CONTENT_SLUG)[keyof typeof CONTENT_SLUG];

/**
 * 역대 운영진 한 기수의 슬러그 — `/operators/44` → `operators-44`.
 *
 * 기수는 주소에서 오는 값이라 모양을 먼저 가른다(`isCohort`). 숫자가 아닌 것을 그대로 슬러그에
 * 붙이면 서버가 400으로 답하고, 그 오류는 «불러오지 못했습니다»로 보여 없는 주소인지 서버가
 * 아픈 것인지 구별되지 않는다.
 */
export function operatorsCohortSlug(cohort: string): string {
  return `operators-${cohort}`;
}

/** 기수 주소 조각의 모양 — 한 자리에서 세 자리 숫자 */
export function isCohort(value: string): boolean {
  return /^\d{1,3}$/.test(value);
}
