import type { NextRequest } from "next/server";
import { updateSession } from "@/shared/lib/supabase/proxy";

/*
 * Next.js 16은 middleware.ts를 proxy.ts로 대체했지만, @opennextjs/cloudflare가 아직
 * proxy.ts 컨벤션을 인식하지 못해 빌드가 깨진다 (opennextjs/opennextjs-cloudflare#962).
 * 어댑터가 지원할 때까지 구 컨벤션(middleware.ts / export function middleware)을 유지한다.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

/*
 * 매처는 좁게 잡는다 — updateSession()이 매 요청 supabase.auth.getUser()로 Supabase를
 * 한 번 왕복하기 때문이다 (Cloudflare Workers에서는 그대로 지연·비용이 된다).
 *
 * 제외 대상:
 * - _next/*, favicon, 정적 자산 — 인증과 무관
 * - f/* — 로그인 없이 여는 공개 폼. 가드도 세션 갱신도 필요 없다
 * - auth/* — OAuth 콜백. 라우트 핸들러가 직접 코드를 교환하며 가드 대상이 아니다
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|f/|auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
