import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isCohort, operatorsCohortSlug } from "@/shared/config/content-slugs";
import { ROUTES } from "@/shared/config/routes";
import { ContentPage, contentPageMetadata } from "@/views/content-page";

/**
 * 역대 운영진 한 기수 — `/operators/44` → 페이지 슬러그 `operators-44` (#520).
 *
 * 기수 모양(`isCohort`)이 아니면 서버에 묻지 않고 404다 — 그대로 보내면 서버가 400으로 답하고
 * 그 오류는 «불러오지 못했습니다»로 보여 없는 주소인지 서버가 아픈 것인지 구별되지 않는다.
 * 기수 모양인데 게시본이 없으면 다른 페이지처럼 «준비 중»이다.
 */
function title(cohort: string): string {
  return `${cohort}기 운영진`;
}

export async function generateMetadata({
  params,
}: PageProps<"/operators/[cohort]">): Promise<Metadata> {
  const { cohort } = await params;
  if (!isCohort(cohort)) return {};
  return contentPageMetadata(operatorsCohortSlug(cohort), title(cohort));
}

export default async function Page({ params }: Readonly<PageProps<"/operators/[cohort]">>) {
  const { cohort } = await params;
  if (!isCohort(cohort)) notFound();

  return (
    <ContentPage
      slug={operatorsCohortSlug(cohort)}
      fallbackTitle={title(cohort)}
      tabs={{ axis: "operators", pathname: ROUTES.operatorsCohort(cohort) }}
    />
  );
}
