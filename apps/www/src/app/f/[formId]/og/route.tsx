import { ImageResponse } from "next/og";
import { toShareDescription } from "@ssccops/share-meta";
import { fetchPublicFormMeta, isFormRef } from "@/entities/form";
import { ORGANIZATION_NAME } from "@/shared/config/site";
import { OgCardFrame, loadOgCardAssets, ogCardResponseOptions } from "@/shared/lib/og-card";

/**
 * 공개 폼 공유 카드 이미지 (ssccops#361) — `GET /f/{ref}/og`, 1200×630 PNG.
 *
 * 크롤러가 `og:image`를 요청하는 순간 제목·안내를 그려 준다. 폼마다 이미지를 만들어 둘 필요가
 * 없고, 데이터는 `generateMetadata`가 쓰는 익명 meta와 같다 — 그래서 새로 새는 것도 없다.
 *
 * **접수 상태·마감일은 그리지 않는다.** 메신저는 이미지도 한 번 캐싱하면 갱신하지 않아, 담으면
 * 마감된 뒤에도 «모집 중»이라 말하는 그림이 방에 남는다(ssccops#194). 제목과 안내 문구만.
 *
 * 폰트·마크 로딩과 그림의 틀은 `shared/lib/og-card.tsx`다 — 사이트 기본 카드(`/og` · #602)와
 * 같은 그림이어야 같은 동아리 링크로 보인다. 자산을 자기 origin에서 HTTP로 받는 이유(Workers의
 * `file://` 함정 · ADR-0030)는 그쪽 주석.
 *
 * meta가 없으면(DRAFT·없는 폼·서버 불통) 서비스 기본 카드를 그린다 — 404를 내면 메신저가 이미지
 * 없는 카드를 만드는데, 그것과 기본 카드 중 후자가 낫고 «없는 폼»을 이미지로 구별해 줄 이유는
 * 없다(meta 경로가 DRAFT와 없는 폼을 나누지 않는 것과 같은 자리).
 */

export const runtime = "nodejs";

/** 제목이 길면 두 줄까지만 — 세 줄부터는 카드에서 잘린다 */
function clampTitle(title: string): string {
  return title.length > 44 ? `${title.slice(0, 43)}…` : title;
}

export async function GET(request: Request, context: RouteContext<"/f/[formId]/og">) {
  const { formId } = await context.params;
  const origin = new URL(request.url).origin;

  const meta = isFormRef(formId) ? await fetchPublicFormMeta(formId) : null;
  const title = meta ? clampTitle(meta.formTtlNm) : "SSCC 신청서";
  const description = meta?.pageDescCn
    ? toShareDescription(meta.pageDescCn)
    : "숭실컴퓨팅클럽(SSCC) 신청서입니다";

  const assets = await loadOgCardAssets(origin);

  return new ImageResponse(
    (
      <OgCardFrame
        assets={assets}
        header={ORGANIZATION_NAME}
        title={title}
        description={description}
        footer="신청서 · 로그인하면 바로 작성할 수 있습니다"
      />
    ),
    ogCardResponseOptions(assets),
  );
}
