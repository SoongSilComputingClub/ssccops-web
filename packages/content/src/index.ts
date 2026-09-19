/*
 * @ssccops/content — 콘텐츠 페이지 카탈로그 (ssccops#392 · #534).
 *
 * www 라우트가 읽는 페이지 슬러그와 어드민이 보여 주는 페이지 목록이 **같은 표 하나**다. 표는
 * 원래 www `shared/config/content-slugs.ts`에만 있었고(#520) 어드민은 «새 페이지 만들기 · 슬러그
 * 자유 입력»이었다 — 표에 없는 이름으로 만든 페이지는 어디에도 나타나지 않고, 홍보국은 표의
 * 이름을 정확히 알아야 했다. 페이지 구성은 FE 라우트와 함께 가는 정형 구조이므로 어드민은 이
 * 카탈로그를 보여 주고 **조회·수정만** 한다(생성은 카탈로그 항목의 첫 저장). 둘 이상이 쓰므로
 * 패키지로 올렸다(«둘 이상» 규칙 · `packages/ui/AGENTS.md`).
 *
 * **새 페이지 종류를 만들 때**: 여기 `CONTENT_PAGES`에 한 줄 + www 라우트. 어드민은 이 표를 읽어
 * 자동으로 줄이 생긴다.
 *
 * 슬러그 모양은 서버 `ContentSlug`(소문자·숫자·하이픈 · 80자 이하)를 따른다. 서버는 슬러그를
 * 자유롭게 받는다 — 허용 목록을 서버에 두면 서버가 www 라우트를 알게 되므로 기각(ssccops#392).
 */

/** 카탈로그 묶음 — 어드민 목록의 절 제목이자 www 상단 바의 축 */
export type ContentPageGroup = "home" | "about" | "operators" | "academic" | "join" | "legal" | "contact";

export const CONTENT_PAGE_GROUP_LABEL: Record<ContentPageGroup, string> = {
  home: "홈",
  about: "SSCC",
  operators: "운영진",
  academic: "학술",
  join: "모집",
  legal: "안내 문서",
  contact: "문의",
};

export interface ContentPageEntry {
  slug: string;
  /** 어드민 목록·제목 미리 채우기에 쓰는 이름. www 화면 제목은 게시본 `ttl`이 이긴다 */
  title: string;
  /** 공개 경로 — www `ROUTES`와 같은 값. 홈 조각은 `/` */
  path: string;
  group: ContentPageGroup;
  /** 어드민 목록 부제 — 이 페이지가 어디에 어떻게 쓰이는가 한 줄 */
  note: string;
}

export const CONTENT_SLUG = {
  /**
   * `/` 맨 위 배너 한 줄 (#524 · ssccops#385) — **게시 중일 때만** 그 줄이 있다. 모집 안내가
   * 이 자리다(상단 바에 «지원하기»를 세우지 않는 대신). 본문 첫 문단만 쓴다
   */
  homeBanner: "home-banner",
  /**
   * `/` hero (#524) — 첫 `# ` 제목이 큰 문장, 그 아래 문단이 소개 한 문단. 본문에 `## 무엇을 하나`
   * 절이 있으면 `### 제목` + 문단 넷을 소개 블록으로 읽는다(www `views/home/model/intro.ts`)
   */
  homeIntro: "home-intro",
  /** `/about` — 소개 */
  about: "about",
  /** `/about/history` — 연혁. 본문은 `{% timeline %}`으로 감싼 `## 연도` + 목록(ADR-0039) */
  history: "history",
  /** `/about/values` — 핵심 가치. `{% cards %}` 안의 `## 가치` + 문단이 카드 하나 */
  values: "values",
  /** `/operators` — 지금 운영진(기수를 주소에 적지 않는 현재 표) */
  operators: "operators",
  /** `/academic` — 학술 활동 안내. 본문 아래에 LMS·기획안 제출 CTA가 코드로 붙는다(#550 · ssccops#412) */
  academic: "academic",
  /** `/join` — 지원 안내. 절차는 `{% steps %}`로 감싼 번호 목록 */
  join: "join",
  /** `/join/faq` — 자주 묻는 질문. `{% faq %}` 안의 `### 질문` + 답이 접이식 항목 하나 */
  joinFaq: "join-faq",
  /** `/join/history` — 지난 모집 */
  joinHistory: "join-history",
  /** `/privacy` — 개인정보처리방침 */
  privacy: "privacy",
  /** `/photo-notice` — 사진 게재 안내 */
  photoNotice: "photo-notice",
  /** `/terms` — 이용약관 */
  terms: "terms",
  /** `/contact` — 문의 안내. 게시본이 있으면 문의처 블록 위에 그 본문을 그리고, 없으면 블록만 (#524) */
  contact: "contact",
} as const;

export type ContentSlug = (typeof CONTENT_SLUG)[keyof typeof CONTENT_SLUG];

/** 카탈로그 — 어드민 목록 순서 그대로. 기수 운영진(`operators-{n}`)은 패턴이라 여기 없다 */
export const CONTENT_PAGES: readonly ContentPageEntry[] = [
  { slug: CONTENT_SLUG.homeBanner, title: "홈 배너", path: "/", group: "home", note: "게시 중일 때만 홈 맨 위 한 줄 — 모집 안내 자리. 본문 첫 문단만 씁니다" },
  { slug: CONTENT_SLUG.homeIntro, title: "홈 소개", path: "/", group: "home", note: "첫 `#` 제목이 큰 문장, 아래 문단이 소개. `## 무엇을 하나` 절의 `###` 넷이 소개 블록" },
  { slug: CONTENT_SLUG.about, title: "SSCC 소개", path: "/about", group: "about", note: "소개 탭" },
  { slug: CONTENT_SLUG.history, title: "연혁", path: "/about/history", group: "about", note: "`{% timeline %}` 안에 `## 연도` + 목록" },
  { slug: CONTENT_SLUG.values, title: "핵심 가치", path: "/about/values", group: "about", note: "`{% cards %}` 안에 `## 가치` + 문단" },
  { slug: CONTENT_SLUG.operators, title: "운영진", path: "/operators", group: "operators", note: "지금 운영진 — 이름은 본인이 동의한 사람만" },
  { slug: CONTENT_SLUG.academic, title: "학술 활동", path: "/academic", group: "academic", note: "스터디·프로젝트가 어떻게 돌아가는가. 아래 «LMS로 가기»·«기획안 제출» 버튼은 코드가 붙인다" },
  { slug: CONTENT_SLUG.join, title: "지원 안내", path: "/join", group: "join", note: "절차는 `{% steps %}` 안의 번호 목록. 모집 중 안내는 홈 배너에" },
  { slug: CONTENT_SLUG.joinFaq, title: "자주 묻는 질문", path: "/join/faq", group: "join", note: "`{% faq %}` 안에 `### 질문` + 답" },
  { slug: CONTENT_SLUG.joinHistory, title: "지난 모집", path: "/join/history", group: "join", note: "기수별 모집 인원 표" },
  { slug: CONTENT_SLUG.privacy, title: "개인정보 처리방침", path: "/privacy", group: "legal", note: "푸터 링크. 빈칸은 회장단이 채웁니다" },
  { slug: CONTENT_SLUG.photoNotice, title: "사진 게재 안내", path: "/photo-notice", group: "legal", note: "푸터 링크" },
  { slug: CONTENT_SLUG.terms, title: "이용약관", path: "/terms", group: "legal", note: "푸터 링크" },
  { slug: CONTENT_SLUG.contact, title: "문의 안내", path: "/contact", group: "contact", note: "게시본이 있으면 문의처 블록 위에 본문이 붙습니다" },
];

/** 슬러그로 카탈로그 항목을 찾는다 — 없으면 null(표에 없는 페이지) */
export function findContentPage(slug: string): ContentPageEntry | null {
  return CONTENT_PAGES.find((entry) => entry.slug === slug) ?? null;
}

/* ── 역대 운영진 — 슬러그 패턴 ────────────────────────────── */

const OPERATORS_PREFIX = "operators-";

/**
 * 역대 운영진 한 기수의 슬러그 — `/operators/44` → `operators-44`.
 *
 * 기수는 주소에서 오는 값이라 모양을 먼저 가른다(`isCohort`). 숫자가 아닌 것을 그대로 슬러그에
 * 붙이면 서버가 400으로 답하고, 그 오류는 «불러오지 못했습니다»로 보여 없는 주소인지 서버가
 * 아픈 것인지 구별되지 않는다.
 */
export function operatorsCohortSlug(cohort: string | number): string {
  return `${OPERATORS_PREFIX}${cohort}`;
}

/** 기수 주소 조각의 모양 — 한 자리에서 세 자리 숫자 */
export function isCohort(value: string): boolean {
  return /^\d{1,3}$/.test(value);
}

/** `operators-44` → 44. 패턴이 아니면 null(그냥 `operators`도 null) */
export function parseOperatorsCohort(slug: string): number | null {
  if (!slug.startsWith(OPERATORS_PREFIX)) return null;
  const rest = slug.slice(OPERATORS_PREFIX.length);
  return isCohort(rest) ? Number(rest) : null;
}

/** 기수 운영진 페이지의 공개 경로 */
export function operatorsCohortPath(cohort: number): string {
  return `/operators/${cohort}`;
}
