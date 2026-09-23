import { CONTENT_CATEGORIES } from "@/entities/content/model/category";
import { ROUTES } from "@/shared/config/routes";
import { SECTION_TABS } from "@/shared/config/section-tabs";
import { NAV_LINKS, externalNavLinks } from "./nav-links";

/*
 * 푸터 «전체 메뉴»의 재료 (#633 · ssccops#460).
 *
 * 세 앱 어디에도 «전체 화면을 한눈에»가 없었다 — 상단 바는 축 일곱 개까지, 축 안의 탭은 그
 * 화면에 들어가야 보인다. 별도 `/sitemap` 화면 대신 푸터에 두는 것은 www의 모든 화면이 이미
 * 푸터를 두르고 있어 «어느 화면에서든 한 번 스크롤이면 전체가 보인다»가 되기 때문이다
 * (크롤러용 `sitemap.xml`은 별개 · #602).
 *
 * **손으로 두 벌 적지 않는다.** 열 = 상단 바 항목(`NAV_LINKS`), 열 안의 줄 = 그 축의 탭
 * (`SECTION_TABS`)과 기록의 분류(`CONTENT_CATEGORIES`). 상단 바나 탭이 바뀌면 여기가 저절로
 * 따라온다. 운영진 축의 대수 탭은 서버 목록이라(#571) 여기서는 «지금»만 — 대수는 그 화면에서.
 * 마지막 열 «내 것»은 로그인 뒤 화면(`/me`)과 다른 앱(LMS)이다 — 세션을 보지 않고 링크만 둔다
 * (푸터는 서버 컴포넌트이고 홈은 세션을 보지 않는다 · ssccops#385).
 */
export interface SiteMapColumn {
  title: string;
  href: string;
  /** 축 안의 줄 — 첫 줄이 열 제목과 같은 주소면 뺀다(같은 링크 둘) */
  rows: readonly { href: string; label: string; external?: boolean }[];
}

function rowsOf(href: string): SiteMapColumn["rows"] {
  switch (href) {
    case ROUTES.about:
      return SECTION_TABS.about.filter((t) => t.href !== href);
    case ROUTES.join:
      return SECTION_TABS.join.filter((t) => t.href !== href);
    case ROUTES.records:
      return CONTENT_CATEGORIES.map((c) => ({
        href: ROUTES.recordsCategory(c.slug),
        label: c.label,
      }));
    default:
      return [];
  }
}

export function siteMapColumns(): readonly SiteMapColumn[] {
  const axes = NAV_LINKS.map((link) => ({
    title: link.label,
    href: link.href,
    rows: rowsOf(link.href),
  }));
  const mine: SiteMapColumn = {
    title: "내 것",
    href: ROUTES.me,
    rows: [
      ...SECTION_TABS.me.filter((t) => t.href !== ROUTES.me),
      ...externalNavLinks().map((l) => ({ href: l.href, label: `학술 ${l.label}`, external: true })),
    ],
  };
  return [...axes, mine];
}
