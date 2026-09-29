import type { Metadata } from "next";
import { CONTENT_SLUG } from "@/shared/config/content-slugs";
import { ROUTES } from "@/shared/config/routes";
import { ContentPage, OperatorCohorts, contentPageMetadata } from "@/views/content-page";

const SLUG = CONTENT_SLUG.operators;
const TITLE = "운영진";

export function generateMetadata(): Promise<Metadata> {
  return contentPageMetadata(SLUG, TITLE);
}

/**
 * 지금 운영진 — 탭 줄은 **소개 축**이고(#723) 역대 대수는 본문 **아래**에 목록으로 선다.
 *
 * 그전에는 이 화면만의 축(«지금» + «44대»·«43대»…)이 탭 줄을 차지했다. 대수는 축의 자매 페이지가
 * 아니라 이 문서의 과거 판본이라 자리를 옮겼다(`OperatorCohorts` 주석).
 */
export default function Page() {
  return (
    <ContentPage
      slug={SLUG}
      fallbackTitle={TITLE}
      tabs={{ axis: "about", pathname: ROUTES.operators }}
      after={<OperatorCohorts />}
    />
  );
}
