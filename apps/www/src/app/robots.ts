import type { MetadataRoute } from "next";
import { ROUTES } from "@/shared/config/routes";
import { isIndexable, siteOrigin } from "@/shared/config/site";

/*
 * `GET /robots.txt` (#602 · ssccops#444).
 *
 * ── dev·오리진 없는 배포는 전부 막는다 ──────────────────────
 * dev(Cloudflare 워커 · `NEXT_PUBLIC_DEPLOY_ENV=dev`)는 prod와 같은 콘텐츠를 다른 도메인에서
 * 그리므로 색인되면 중복이고 검색 결과에 dev 주소가 뜬다 — 판정은 `isIndexable()` 한 곳
 * (`shared/config/site.ts`). 그전에는 세 앱 모두 이 파일이 없어 404였고, 404는 «다 긁어가라»와
 * 같다(2026-09-21 실측).
 *
 * ── prod가 막는 경로 ────────────────────────────────────────
 * 로그인해야 뜻이 있는 화면(`/me`·`/notifications`(#616)·신청·공개 폼)과 크롤러에 카드만 주는
 * 착지(`/s/`)·OAuth 콜백. `/f/`는 링크를 아는 회원이 답을 내는 폼이라 «공개»여도 검색될 자리가 아니다. 나머지
 * (행사·콘텐츠·기록)는 익명 SSR이라 그대로 연다. 세션 여부에 따라 다른 HTML을 그리는 경로가
 * 없으므로 목록은 이것으로 끝이다 — 새 로그인 화면이 생기면 여기도 한 줄.
 *
 * `Sitemap:`은 절대 주소여야 하므로 오리진(`siteOrigin()`)이 있을 때만 — 없으면 위에서 이미
 * 전부 막았다. 요청 시점 API를 읽지 않으므로 빌드 때 정적으로 굳는다(값이 전부 빌드 변수다).
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  if (!isIndexable() || !origin) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        ROUTES.me,
        `${ROUTES.me}/`,
        ROUTES.notifications,
        "/events/*/apply",
        "/f/",
        "/s/",
        "/auth/",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
