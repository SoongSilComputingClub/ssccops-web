import { ROUTES } from "@/shared/config/routes";

/**
 * 상단 바 메뉴 목차 — 데스크톱 메뉴와 모바일 드로어가 **이 한 벌**을 함께 쓴다 (#167).
 *
 * 목차를 컴포넌트 밖에 둔 이유는 어드민 셸(`use-shell-nav.ts`)과 같다 — 한쪽에만 메뉴를
 * 더하면 다른 쪽에서 빠진다. 소개·활동 같은 페이지가 붙을 때 여기 한 줄을 늘리면 된다.
 *
 * 로그인 상태에 따라 갈리는 항목('내 신청'·로그아웃)은 여기 없다 — 그것은 `AuthNav`가
 * 클라이언트에서 판정해 그린다(익명 공개인 목록·상세 렌더에 세션 조회를 끼워 넣지 않으려고).
 */
export type NavLink = {
  href: string;
  label: string;
  /** 현재 경로가 이 항목에 속하는지 — 상세(/events/1)에서도 '행사'가 켜져야 한다 */
  isActive: (pathname: string) => boolean;
};

export const NAV_LINKS: readonly NavLink[] = [
  {
    href: ROUTES.events,
    label: "행사",
    isActive: (pathname) => pathname === ROUTES.events || pathname.startsWith("/events"),
  },
];
