import type { Metadata } from "next";
import { CONTENT_SLUG } from "@/shared/config/content-slugs";
import {
  AcademicCta,
  AcademicPrograms,
  ContentPage,
  contentPageMetadata,
} from "@/views/content-page";

const SLUG = CONTENT_SLUG.academic;
const TITLE = "학술 프로그램";

export function generateMetadata(): Promise<Metadata> {
  return contentPageMetadata(SLUG, TITLE);
}

/**
 * 학술 — 페이지 본문 + 모집 중인 학술 프로그램(#587 · ADR-0043) + LMS·기획안 제출 CTA (#550).
 * 축 안에 하위 페이지가 없어 탭 줄은 없다. 프로그램 목록이 CTA 위인 것은 «무엇이 열려 있나»를
 * 본 뒤에 «참여하기»가 오는 순서라서다.
 */
export default function Page() {
  return (
    <ContentPage
      slug={SLUG}
      fallbackTitle={TITLE}
      after={
        <>
          <AcademicPrograms />
          <AcademicCta />
        </>
      }
    />
  );
}
