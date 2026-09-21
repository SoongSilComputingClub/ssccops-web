import { ROUTES } from "./routes";

/*
 * 하위 내비 — 세 축(SSCC · 운영진 · 모집) 안의 탭 줄 (#524 · ssccops#385).
 *
 * #520이 하위 페이지(연혁·핵심 가치·역대 운영진·FAQ·지난 모집)를 만들었지만 가는 길이 없었다 —
 * 상단 바는 축 하나에 항목 하나라 `/about/history`는 주소를 아는 사람만 열 수 있었다. 이 표가
 * 페이지 제목 아래 탭 줄이 되어 그 길을 준다. 기록 축은 분류 탭(`views/records`)이 이미 있어
 * 여기 없고, 법적 페이지(개인정보처리방침·사진 게재 안내·이용약관)는 축이 아니라 탭이 없다.
 *
 * 상단 바 항목(`app/_shell/nav-links.ts`)과 같은 모양(`href`·`label`·`isActive`)이다. 둘을
 * 한 표로 합치지 않은 것은 상단 바가 클라이언트 컴포넌트(경로로 켜기)이고 탭 줄은 서버
 * 컴포넌트가 자기 주소를 넘겨 그리기 때문이다 — 같은 표를 양쪽에서 읽으면 어느 쪽이 정본인지
 * 흐려진다.
 *
 * 드롭다운 메뉴는 기각했다 — 모바일 드로어에서 2단 메뉴를 열고 닫는 상태가 하나 더 생기고,
 * 데스크톱에서는 마우스를 올려야 하위 항목이 보여 «있는지» 알기 어렵다. 탭은 페이지 안에 늘
 * 보인다.
 */
/*
 * `me`(내 활동 · #574 · ssccops#428)는 콘텐츠 축이 아니라 로그인한 부원의 화면이지만 같은 탭 줄을
 * 쓴다 — 허브 `/me` 아래 내부 페이지 넷(신청한 행사 · 낸 폼 · 낸 기획안 · 이끄는 프로그램)으로
 * 가는 길이고, lms `/my/applications`처럼 «내 것»을 종류별로 한 장씩 보는 모양이다.
 */
export type SectionAxis = "about" | "operators" | "join" | "me";

export interface SectionTab {
  href: string;
  label: string;
  /** 지금 주소가 이 탭인가 */
  isActive: (pathname: string) => boolean;
}

export const exact = (href: string) => (pathname: string) => pathname === href;

export const SECTION_TABS: Record<SectionAxis, readonly SectionTab[]> = {
  about: [
    { href: ROUTES.about, label: "소개", isActive: exact(ROUTES.about) },
    { href: ROUTES.aboutHistory, label: "연혁", isActive: exact(ROUTES.aboutHistory) },
    { href: ROUTES.aboutValues, label: "핵심 가치", isActive: exact(ROUTES.aboutValues) },
  ],
  /*
   * 운영진 축은 «지금» 하나만 여기 있다 — 역대 대수 탭(«44대»·«43대»…)은 게시된 페이지 목록에서
   * 만들어지므로(#571 · `views/content-page/model/operators-tabs.ts`) 정적 표에 둘 수 없다.
   */
  operators: [{ href: ROUTES.operators, label: "지금", isActive: exact(ROUTES.operators) }],
  join: [
    { href: ROUTES.join, label: "안내", isActive: exact(ROUTES.join) },
    { href: ROUTES.joinFaq, label: "FAQ", isActive: exact(ROUTES.joinFaq) },
    { href: ROUTES.joinHistory, label: "지난 모집", isActive: exact(ROUTES.joinHistory) },
  ],
  /*
   * 내 활동 — 허브는 «요약». 상태 필터(`?status=`)가 붙어도 같은 탭이 켜지도록 `exact`는
   * pathname만 본다(쿼리는 `pathname`에 실리지 않는다).
   */
  me: [
    { href: ROUTES.me, label: "요약", isActive: exact(ROUTES.me) },
    {
      href: ROUTES.meApplications,
      label: "신청한 행사",
      isActive: exact(ROUTES.meApplications),
    },
    { href: ROUTES.meResponses, label: "낸 폼", isActive: exact(ROUTES.meResponses) },
    { href: ROUTES.meProposals, label: "낸 기획안", isActive: exact(ROUTES.meProposals) },
    { href: ROUTES.mePrograms, label: "이끄는 프로그램", isActive: exact(ROUTES.mePrograms) },
  ],
};
