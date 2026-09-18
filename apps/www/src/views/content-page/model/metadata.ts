import type { Metadata } from "next";
import { toShareDescription } from "@ssccops/share-meta";
import { fetchPublicPage } from "@/entities/content";

/**
 * 페이지 화면의 공유 카드 메타 (#520) — 열한 개 라우트가 같은 것을 쓴다.
 *
 * 제목과 본문 요약만 싣는다. **시간값(게시일)은 싣지 않는다** — 메신저는 카드를 한 번 캐싱하면
 * 갱신하지 않는다(`apps/www/AGENTS.md` «공유 카드»). 페이지에는 표지가 없어 이미지도 없다.
 *
 * 조회는 본문 쪽과 한 번 더 겹치지만 Next가 같은 GET을 한 렌더 안에서 메모이즈한다(행사 상세와
 * 같다). 게시본이 없거나 조회에 실패하면 표의 기본 제목만 남긴다 — 카드가 밋밋한 것과 페이지가
 * 안 뜨는 것은 무게가 다르다.
 */
export async function contentPageMetadata(slug: string, fallbackTitle: string): Promise<Metadata> {
  try {
    const page = await fetchPublicPage(slug);
    const description = toShareDescription(page.mtxt) || undefined;
    return {
      title: page.ttl,
      description,
      openGraph: {
        // og:title 에는 레이아웃의 title.template 이 적용되지 않아 서비스 이름을 직접 붙인다
        title: `${page.ttl} · SSCC`,
        description,
        type: "article",
      },
    };
  } catch {
    return { title: fallbackTitle };
  }
}
