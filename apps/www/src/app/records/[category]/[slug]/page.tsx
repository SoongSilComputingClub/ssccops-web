import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toShareDescription } from "@ssccops/share-meta";
import {
  categoryBySlug,
  fetchPublicPost,
  formatSemester,
  parseSemesterPath,
} from "@/entities/content";
import { PostDetailPage, SemesterPage } from "@/views/records";

/**
 * `/records/{a}/{b}` — 두 화면이 한 라우트를 나눠 쓴다 (#520).
 *
 * - `/records/{category}/{slug}` 포스트 상세
 * - `/records/{year}/{semester}` 학기별 묶음
 *
 * Next는 같은 자리에 이름이 다른 동적 세그먼트 둘(`[category]`와 `[year]`)을 두지 못한다.
 * 그래서 첫 조각의 **모양**으로 가른다 — 네 자리 숫자면 연도, 분류 표에 있으면 분류, 둘 다
 * 아니면 404. 분류 조각은 알파벳뿐이라(`academic`·`event`·`news`) 겹칠 수 없다.
 */
export async function generateMetadata({
  params,
}: PageProps<"/records/[category]/[slug]">): Promise<Metadata> {
  const { category, slug } = await params;

  const semester = parseSemesterPath(category, slug);
  if (semester) return { title: formatSemester(semester) };

  if (!categoryBySlug(category)) return {};

  try {
    const post = await fetchPublicPost(slug);
    /*
     * 요약이 있으면 요약, 없으면 본문 앞부분. **활동일·게시일은 싣지 않는다** — 메신저 카드는
     * 한 번 굳는다(`apps/www/AGENTS.md` «공유 카드»). 표지가 없으면 이미지 필드를 아예 비운다.
     */
    const description = post.smry || toShareDescription(post.mtxt) || undefined;
    return {
      title: post.ttl,
      description,
      openGraph: {
        title: `${post.ttl} · SSCC`,
        description,
        type: "article",
        images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default async function Page({
  params,
}: Readonly<PageProps<"/records/[category]/[slug]">>) {
  const { category, slug } = await params;

  const semester = parseSemesterPath(category, slug);
  if (semester) return <SemesterPage range={semester} />;

  const found = categoryBySlug(category);
  if (!found) notFound();

  return <PostDetailPage category={found} slug={slug} />;
}
