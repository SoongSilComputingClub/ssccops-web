import { ROUTES } from "@/shared/config/routes";

/**
 * 상단 바 메뉴 목차 — 데스크톱 메뉴와 모바일 드로어가 **이 한 벌**을 함께 쓴다 (#167).
 *
 * 목차를 컴포넌트 밖에 둔 이유는 어드민 셸(`use-shell-nav.ts`)과 같다 — 한쪽에만 메뉴를
 * 더하면 다른 쪽에서 빠진다.
 *
 * ── 다섯 축 (#520 · ssccops#382) ────────────────────────────
 * SSCC · 운영진 · 활동 · 모집 · 문의. **«지원하기» CTA는 없다** — 지원은 학기 초뿐이라 평소의
 * 상단 바에 세워 둘 것이 아니고, 모집 때는 홈 배너(#524 · ssccops#385)가 안내한다. «행사»는
 * «활동» 축에 들어갔다 — 행사 목록 `/events`와 상세 `/events/{id}`에서 «활동»이 켜진다(홈은
 * 어느 축도 켜지 않는다). «문의»는 #520에서는 푸터 블록으로 가는 앵커였는데 #524에서 화면
 * (`/contact`)이 됐다 — 앵커는 켜지지도 않고 공유할 주소도 없었다. 하위 페이지(연혁·역대·FAQ…)로
 * 가는 길은 상단 바가 아니라 페이지 제목 아래 탭 줄(`shared/config/section-tabs.ts`)이다.
 *
 * 로그인 상태에 따라 갈리는 항목('내 활동'·로그아웃)은 여기 없다 — 그것은 `AuthNav`가
 * 클라이언트에서 판정해 그린다(익명 공개인 목록·상세 렌더에 세션 조회를 끼워 넣지 않으려고).
 */
export type NavLink = {
  href: string;
  label: string;
  /** 현재 경로가 이 항목에 속하는지 — 상세(/activities/news/x)에서도 '활동'이 켜져야 한다 */
  isActive: (pathname: string) => boolean;
};

const startsWith = (prefix: string) => (pathname: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const NAV_LINKS: readonly NavLink[] = [
  { href: ROUTES.about, label: "SSCC", isActive: startsWith(ROUTES.about) },
  { href: ROUTES.operators, label: "운영진", isActive: startsWith(ROUTES.operators) },
  {
    href: ROUTES.activities,
    label: "활동",
    isActive: (pathname) =>
      startsWith(ROUTES.activities)(pathname) || startsWith(ROUTES.events)(pathname),
  },
  { href: ROUTES.join, label: "모집", isActive: startsWith(ROUTES.join) },
  { href: ROUTES.contact, label: "문의", isActive: startsWith(ROUTES.contact) },
];
