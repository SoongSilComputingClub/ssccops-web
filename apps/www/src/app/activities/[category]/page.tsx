import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryBySlug } from "@/entities/content";
import { CURSOR_QUERY } from "@/shared/config/routes";
import { ActivitiesPage } from "@/views/activities";

/**
 * 한 분류의 목록 — `/activities/academic` (#520).
 *
 * 분류 조각이 표(`entities/content` `CONTENT_CATEGORIES`)에 없으면 404다. 연도만 있는 주소
 * (`/activities/2026`)도 여기 오는데 학기 없는 연도 묶음은 화면이 없어 같은 404다 —
 * 학기별 묶음은 `/activities/{year}/{semester}`.
 */
export async function generateMetadata({
  params,
}: PageProps<"/activities/[category]">): Promise<Metadata> {
  const { category } = await params;
  const found = categoryBySlug(category);
  return found ? { title: `${found.label} 활동` } : {};
}

export default async function Page({
  params,
  searchParams,
}: Readonly<PageProps<"/activities/[category]">>) {
  const [{ category }, query] = await Promise.all([params, searchParams]);
  const found = categoryBySlug(category);
  if (!found) notFound();

  const raw = query[CURSOR_QUERY];
  const cursor = (Array.isArray(raw) ? raw[0] : raw) || null;

  return <ActivitiesPage category={found} cursor={cursor} />;
}
