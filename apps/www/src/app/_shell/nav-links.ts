import { lmsOrigin } from "@/shared/config/lms-routes";
import { ROUTES } from "@/shared/config/routes";
import { SECTION_TABS } from "@/shared/config/section-tabs";

/**
 * 상단 바 메뉴 목차 — 데스크톱 메뉴와 모바일 드로어가 **이 한 벌**을 함께 쓴다 (#167).
 *
 * 목차를 컴포넌트 밖에 둔 이유는 어드민 셸(`use-shell-nav.ts`)과 같다 — 한쪽에만 메뉴를
 * 더하면 다른 쪽에서 빠진다.
 *
 * ── 다섯 축과 그 하위 (#712 · ssccops#533 · ADR-0056) ─────────
 * 소개 ▾(소개·연혁·핵심 가치·운영진·문의) · 기록 · 행사 · 학술 · 모집 ▾(안내·FAQ·지난 모집).
 *
 * 그전에는 일곱 항목이 평평했고 하위 페이지로 가는 길은 **그 축에 착지한 뒤의** 탭 줄뿐이었다 —
 * `/about`을 열기 전에는 연혁이 있는지 알 수 없었다. 축이 자랄 때마다 1차가 한 칸씩 길어진 것도
 * 같은 구조의 값이다(#520 여섯 → #529 «행사» → #524 «문의»). ADR-0056이 그것을 접었다.
 *
 * **«운영진»·«문의»는 «소개» 축 안이다.** 그래서 이 둘의 주소에서도 상단 바는 «소개»가 켜진다 —
 * `aboutAxisActive`가 셋을 함께 받는다. 주소·화면은 그대로다(옮긴 것은 목차뿐).
 *
 * **«지원하기» CTA는 없다** — 지원은 학기 초뿐이라 평소의 상단 바에 세워 둘 것이 아니고, 모집
 * 때는 홈 배너(#524 · ssccops#385)가 안내한다.
 *
 * **하위 목록을 두 벌 적지 않는다.** «소개»·«모집»의 `children`은 페이지 탭 줄이 쓰는
 * `SECTION_TABS`(`shared/config/section-tabs.ts`)를 **읽어서** 만든다 — 축에 탭이 하나 늘면
 * 드롭다운도 함께 는다. 탭 줄을 없애지는 않았다: 드롭다운은 **착지 전의 길**이고 탭 줄은
 * **착지한 뒤의 현재 위치**다(ADR-0056).
 *
 * **대수 탭(«44대»·«43대»)은 드롭다운에 넣지 않는다**(#571) — 게시된 페이지 수만큼 자라는
 * 목록이라 학기마다 드롭다운이 길어진다. 드롭다운의 «운영진»은 `/operators` 한 줄이고 대수는
 * 그 화면의 탭 줄이 계속 맡는다.
 *
 * 로그인 상태에 따라 갈리는 항목('내 활동'·로그아웃)은 여기 없다 — 그것은 `AuthNav`가
 * 클라이언트에서 판정해 그린다(익명 공개인 목록·상세 렌더에 세션 조회를 끼워 넣지 않으려고).
 */
export type NavChild = {
  href: string;
  label: string;
  /**
   * 지금 주소가 이 줄인가. 탭에서 온 줄은 그 탭의 판정(정확히 일치)을 그대로 쓰고, 하위 주소가
   * 있는 줄(운영진의 `/operators/43`)은 접두로 받는다 — 아니면 대수 페이지에서 드롭다운의
   * 어느 줄도 켜지지 않아 «어디에 있나»가 사라진다.
   */
  isActive: (pathname: string) => boolean;
};

export type NavLink = {
  href: string;
  label: string;
  /** 현재 경로가 이 항목에 속하는지 — 상세(/records/news/x)에서도 '기록'이 켜져야 한다 */
  isActive: (pathname: string) => boolean;
  /** 축 안의 하위 — 있으면 드롭다운(데스크톱)·들여쓴 줄(드로어)이 된다 */
  children?: readonly NavChild[];
};

const startsWith = (prefix: string) => (pathname: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** «소개» 축은 소개·운영진·문의 세 주소를 품는다 (ADR-0056) */
const aboutAxisActive = (pathname: string) =>
  startsWith(ROUTES.about)(pathname) ||
  startsWith(ROUTES.operators)(pathname) ||
  startsWith(ROUTES.contact)(pathname);

const tabsAsChildren = (
  tabs: readonly { href: string; label: string; isActive: (p: string) => boolean }[],
): readonly NavChild[] => tabs.map(({ href, label, isActive }) => ({ href, label, isActive }));

export const NAV_LINKS: readonly NavLink[] = [
  // «소개»(#633 · ssccops#460) — «SSCC»였는데 브랜드 «SSCC» 바로 옆이라 같은 글자가 둘이었다.
  // 페이지 제목·탭 축 이름과 같은 «소개»로. 주소(`/about`)는 그대로
  {
    href: ROUTES.about,
    label: "소개",
    isActive: aboutAxisActive,
    children: [
      ...tabsAsChildren(SECTION_TABS.about),
      { href: ROUTES.operators, label: "운영진", isActive: startsWith(ROUTES.operators) },
      { href: ROUTES.contact, label: "문의", isActive: startsWith(ROUTES.contact) },
    ],
  },
  // «기록»(#585 · ssccops#437) — 포스트 아카이브. «활동»이었는데 학술 프로그램(ADR-0043)과 이름이 부딪혔다. 주소도 #591에서 `/records`(ssccops#439)
  // 분류 탭(학술·행사·소식)이 화면 안에 이미 있어 드롭다운을 두지 않는다
  { href: ROUTES.records, label: "기록", isActive: startsWith(ROUTES.records) },
  { href: ROUTES.events, label: "행사", isActive: startsWith(ROUTES.events) },
  // 학술은 설명 페이지 → LMS (#550) — 상단 바에서 다른 앱으로 바로 나가지 않는다
  { href: ROUTES.academic, label: "학술", isActive: startsWith(ROUTES.academic) },
  {
    href: ROUTES.join,
    label: "모집",
    isActive: startsWith(ROUTES.join),
    children: tabsAsChildren(SECTION_TABS.join),
  },
];

/*
 * 다른 앱으로 가는 항목 — 지금은 LMS 하나 (#577 · ssccops#430).
 *
 * `NAV_LINKS`에 섞지 않는 것은 저쪽 항목이 이 앱의 화면이라 `isActive`가 있고 `<Link>`로 가기
 * 때문이다 — 외부 앱은 켜질 일이 없고 `<a>`로 나간다. 오리진(`NEXT_PUBLIC_LMS_ORIGIN`)이 비면
 * 항목 자체가 없다(죽은 주소로 보내지 않는다 — `lms-routes.ts`). «학술» 랜딩(#550)의 CTA는
 * 설명 뒤의 유도이고, 이것은 이미 LMS를 쓰는 부원의 지름길이다.
 *
 * **읽는 곳은 푸터뿐이다** (#614 · ssccops#452). 상단 바·드로어에서는 뺐다 — 다른 앱은 계정
 * 메뉴 절 ④의 자리이고 그쪽은 `features/auth`의 `accountApps()`가 같은 오리진으로 만든다.
 */
export type ExternalNavLink = { href: string; label: string };

export function externalNavLinks(): readonly ExternalNavLink[] {
  const lms = lmsOrigin();
  return lms ? [{ href: lms, label: "LMS" }] : [];
}
