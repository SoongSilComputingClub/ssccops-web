import { headers } from "next/headers";
import { type OgCard, ogImagePath } from "@/shared/config/og-cards";

/**
 * 공유 카드 이미지의 **절대 주소** (#556 · ssccops#418).
 *
 * `og:image`는 절대 주소여야 메신저가 받는다. `metadataBase`를 두지 않는 것은 dev·prod 도메인이
 * 다르고 이 앱이 자기 오리진을 env로 갖고 있지 않기 때문이다 — www 공개 폼 카드와 같이 요청
 * 헤더에서 만든다. 프록시(Vercel·Cloudflare) 뒤라 `x-forwarded-host`·`x-forwarded-proto`를 먼저
 * 보고, 호스트를 못 읽으면 `null`을 돌려 호출한 쪽이 이미지를 빼고 텍스트 카드로 떨어진다.
 *
 * `headers()`를 읽으므로 **서버 전용**이고 `shared/ui` 배럴에 싣지 않는다 — 클라이언트 컴포넌트가
 * 끌어오면 빌드가 깨진다(`entities/academic-program/api/programs-read`와 같은 취급).
 */
export async function ogImageUrl(card: OgCard): Promise<string | null> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${ogImagePath(card)}`;
}
