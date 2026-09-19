import type { Metadata } from "next";
import { CONTENT_SLUG } from "@/shared/config/content-slugs";
import { AcademicCta, ContentPage, contentPageMetadata } from "@/views/content-page";

const SLUG = CONTENT_SLUG.academic;
const TITLE = "학술 활동";

export function generateMetadata(): Promise<Metadata> {
  return contentPageMetadata(SLUG, TITLE);
}

/** 학술 — 페이지 본문 + LMS·기획안 제출 CTA (#550). 축 안에 하위 페이지가 없어 탭 줄은 없다 */
export default function Page() {
  return <ContentPage slug={SLUG} fallbackTitle={TITLE} after={<AcademicCta />} />;
}
