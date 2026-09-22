import { ImageResponse } from "next/og";
import { OG_CARDS, resolveOgCard } from "@/shared/config/og-cards";
import { OgCardFrame, loadOgCardAssets, ogCardResponseOptions } from "@/shared/lib/og-card";

/**
 * 사이트 기본 공유 카드 이미지 (#602 · ssccops#444) — `GET /og?card=default`, 1200×630 PNG.
 *
 * 루트 레이아웃의 `openGraph.images`가 이 주소를 건다 — 그전에는 기본 og:image가 없어 홈·소개·
 * 기록 목록 링크를 메신저에 붙이면 제목만 뜨고 이미지가 없었다(행사·포스트는 대표 이미지가
 * 있을 때만, 폼은 자기 카드 `f/[formId]/og`). lms `app/og/route.tsx`(#556)와 같은 모양이고 틀은
 * `shared/lib/og-card.tsx`(폼 카드와 공유).
 *
 * **파일 규약(`opengraph-image.tsx`)이 아니라 라우트다.** 파일 규약은 요청 시점의 env·쿼리로
 * 갈릴 수 없다 — 마크가 `deployMarks()`로 dev·prod가 갈리고(#449) 카드가 늘면 쿼리로 고르는
 * 쪽이 자연스럽다(favicon 파일 규약을 걷어낸 #413과 같은 이유).
 *
 * **카드는 허용 목록(`OG_CARDS`)에서만 고른다.** 쿼리의 문자열을 그대로 그리지 않는다 — 모르는
 * 키는 기본 카드. 폰트·마크는 자기 origin에서 받는다(틀 주석 · ADR-0030).
 */

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const card = OG_CARDS[resolveOgCard(url.searchParams.get("card"))];
  const assets = await loadOgCardAssets(url.origin);

  return new ImageResponse(
    (
      <OgCardFrame
        assets={assets}
        header={card.header}
        title={card.title}
        description={card.description}
        footer={card.footer}
      />
    ),
    ogCardResponseOptions(assets),
  );
}
