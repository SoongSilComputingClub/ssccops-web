import type { Metadata } from "next";
import { CONTENT_SLUG } from "@/shared/config/content-slugs";
import { ROUTES } from "@/shared/config/routes";
import { ContentPage, JoinCta, contentPageMetadata } from "@/views/content-page";

const SLUG = CONTENT_SLUG.join;
const TITLE = "지원 안내";

export function generateMetadata(): Promise<Metadata> {
  return contentPageMetadata(SLUG, TITLE);
}

/** 모집 안내 — 페이지 본문 + 지정된 모집 폼의 «지원하기» (#588 · ADR-0044). 접수 중이 아니면 CTA 블록이 없다 */
export default function Page() {
  return (
    <ContentPage
      slug={SLUG}
      fallbackTitle={TITLE}
      tabs={{ axis: "join", pathname: ROUTES.join }}
      after={<JoinCta />}
    />
  );
}
