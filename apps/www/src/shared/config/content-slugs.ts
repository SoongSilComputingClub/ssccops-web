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
  /**
   * `/` 맨 위 배너 한 줄 (#524 · ssccops#385) — **게시 중일 때만** 그 줄이 있다. 모집 안내가
   * 이 자리다(상단 바에 «지원하기»를 세우지 않는 대신). 본문 첫 문단만 쓴다
   */
  homeBanner: "home-banner",
  /**
   * `/` hero (#524) — 첫 `# ` 제목이 큰 문장, 그 아래 문단이 소개 한 문단. 본문에 `## 무엇을 하나`
   * 절이 있으면 `### 제목` + 문단 넷을 소개 블록으로 읽는다(`views/home/model/intro.ts`)
   */
  homeIntro: "home-intro",
  /** `/about` — 소개 */
  about: "about",
  /** `/about/history` — 연혁. `## 연도` + 목록 → `timeline` 프리셋(연도 점 · 세로선) */
  history: "history",
  /** `/about/values` — 핵심 가치. `## 가치` 절마다 카드(`cards` 프리셋), `---` 뒤 문단은 격자 아래 */
  values: "values",
  /** `/operators` — 지금 운영진(기수를 주소에 적지 않는 현재 표) */
  operators: "operators",
  /** `/join` — 지원 안내. 번호 목록이 단계 원(`steps` 프리셋) */
  join: "join",
  /** `/join/faq` — 자주 묻는 질문. `### 질문` + 답 → 접이식 Q/A(`faq` 프리셋) */
  joinFaq: "join-faq",
  /** `/join/history` — 지난 모집 */
  joinHistory: "join-history",
  /** `/privacy` — 개인정보처리방침. `## 1. …` 절 → 목차 + 앵커(`legal` 프리셋) */
  privacy: "privacy",
  /** `/photo-notice` — 사진 게재 안내 */
  photoNotice: "photo-notice",
  /** `/terms` — 이용약관 */
  terms: "terms",
  /** `/contact` — 문의 안내. 게시본이 있으면 문의처 블록 위에 그 본문을 그리고, 없으면 블록만 (#524) */
  contact: "contact",
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

/**
 * 역대 운영진 페이지가 게시된 기수 — 운영진 축의 «역대» 탭이 첫 항목으로 간다 (#524).
 *
 * **손으로 적는 표다.** 서버에 «게시된 페이지 목록» 익명 API가 없어(ADR-0038 — 슬러그 하나씩만
 * 읽는다) 기수를 훑어 알아낼 길이 없고, 슬러그 `operators-1`부터 차례로 찔러 보는 것은 요청
 * 수십 개를 한 화면에 얹는 일이라 기각했다. 홍보국이 새 기수 페이지를 게시하면 여기에 한 줄
 * 더한다 — 표에 없는 기수도 주소(`/operators/43`)로는 열린다. 최신 기수가 앞이다.
 */
export const OPERATOR_COHORTS: readonly number[] = [44];
