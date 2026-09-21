import type { MetadataRoute } from "next";

/*
 * `GET /robots.txt` — 전부 차단 (#602 · ssccops#444).
 *
 * 전 화면이 로그인 필수인 부원용 앱이라 검색에 잡힐 화면이 없다 — 검색으로 올 사람은 www가
 * 받는다(«학술» 랜딩 `/academic`). 그전에는 이 파일이 없어 404였고, 404는 «다 긁어가라»와
 * 같다(2026-09-21 실측). 루트 `metadata.robots`의 noindex가 짝이다 — robots.txt는 «긁지 마라»
 * 이고 링크로 알게 된 주소를 결과에 싣지 않게 하는 것은 페이지의 noindex다. 공유 카드(`/og`·
 * OG 메타)는 그대로다 — 메신저 크롤러는 robots.txt를 보지 않는다. dev·prod 구분 없이 같은
 * 값이라 `NEXT_PUBLIC_DEPLOY_ENV`를 보지 않는다.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
