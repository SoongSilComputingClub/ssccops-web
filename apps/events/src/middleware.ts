import type { NextRequest } from "next/server";
import { updateSession } from "@/shared/lib/supabase/proxy";

/*
 * Next.js 16은 middleware.ts를 proxy.ts로 대체했지만, @opennextjs/cloudflare가 아직
 * proxy.ts 컨벤션을 인식하지 못해 빌드가 깨진다 (opennextjs/opennextjs-cloudflare#962).
 * 어드민과 같은 이유로 구 컨벤션(middleware.ts / export function middleware)을 유지한다.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

/*
 * 매처는 **'내 신청' 한 경로만** 잡는다.
 *
 * updateSession()은 요청마다 Supabase를 한 번 왕복한다. 이 앱의 본체(행사 목록·상세)는 익명
 * 공개라 세션이 필요 없고, 링크 공유로 들어오는 트래픽이 대부분이라 거기에 왕복을 붙이면
 * 로그인하지 않는 사람들이 비용을 대신 낸다. 토큰이 실제로 필요한 화면은 /my-applications
 * 하나뿐이므로 갱신도 그 경로에서만 한다.
 *
 * /auth/callback은 제외한다 — 콜백 라우트가 스스로 코드를 세션으로 교환하며, 그 시점에는
 * 아직 갱신할 세션이 없다.
 */
export const config = {
  matcher: ["/my-applications"],
};
