import { lmsOrigin } from "@/shared/config/lms-routes";
import { ROUTES } from "@/shared/config/routes";

/**
 * 상단 바 메뉴 목차 — 데스크톱 메뉴와 모바일 드로어가 **이 한 벌**을 함께 쓴다 (#167).
 *
 * 목차를 컴포넌트 밖에 둔 이유는 어드민 셸(`use-shell-nav.ts`)과 같다 — 한쪽에만 메뉴를
 * 더하면 다른 쪽에서 빠진다.
 *
 * ── 일곱 항목 (#520 · ssccops#382 · #529 · ssccops#389 · #550 · ssccops#412) ─────────
 * SSCC · 운영진 · 기록 · 행사 · 학술 · 모집 · 문의. **«지원하기» CTA는 없다** — 지원은 학기 초뿐이라
 * 평소의 상단 바에 세워 둘 것이 아니고, 모집 때는 홈 배너(#524 · ssccops#385)가 안내한다.
 * «행사»는 #520에서 «활동» 축 안에 넣었는데(행사 목록에서 «활동»이 켜졌다) 2026-09-19 검토에서
 * 행사 목록으로 가는 길이 홈의 «행사 전체 보기» 하나뿐이라 항목으로 세웠다(ssccops#389) —
 * `/events`에서는 «행사»가, `/records`에서는 «기록»이 켜진다(홈은 어느 것도 켜지 않는다).
 * «문의»는 #520에서는 푸터 블록으로 가는 앵커였는데 #524에서 화면
 * (`/contact`)이 됐다 — 앵커는 켜지지도 않고 공유할 주소도 없었다. 하위 페이지(연혁·역대·FAQ…)로
 * 가는 길은 상단 바가 아니라 페이지 제목 아래 탭 줄(`shared/config/section-tabs.ts`)이다.
 *
 * 로그인 상태에 따라 갈리는 항목('내 활동'·로그아웃)은 여기 없다 — 그것은 `AuthNav`가
 * 클라이언트에서 판정해 그린다(익명 공개인 목록·상세 렌더에 세션 조회를 끼워 넣지 않으려고).
 */
export type NavLink = {
  href: string;
  label: string;
  /** 현재 경로가 이 항목에 속하는지 — 상세(/records/news/x)에서도 '기록'이 켜져야 한다 */
  isActive: (pathname: string) => boolean;
};

const startsWith = (prefix: string) => (pathname: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const NAV_LINKS: readonly NavLink[] = [
  { href: ROUTES.about, label: "SSCC", isActive: startsWith(ROUTES.about) },
  { href: ROUTES.operators, label: "운영진", isActive: startsWith(ROUTES.operators) },
  // «기록»(#585 · ssccops#437) — 포스트 아카이브. «활동»이었는데 학술 프로그램(ADR-0043)과 이름이 부딪혔다. 주소도 #591에서 `/records`(ssccops#439)
  { href: ROUTES.records, label: "기록", isActive: startsWith(ROUTES.records) },
  { href: ROUTES.events, label: "행사", isActive: startsWith(ROUTES.events) },
  // 학술은 설명 페이지 → LMS (#550) — 상단 바에서 다른 앱으로 바로 나가지 않는다
  { href: ROUTES.academic, label: "학술", isActive: startsWith(ROUTES.academic) },
  { href: ROUTES.join, label: "모집", isActive: startsWith(ROUTES.join) },
  { href: ROUTES.contact, label: "문의", isActive: startsWith(ROUTES.contact) },
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
