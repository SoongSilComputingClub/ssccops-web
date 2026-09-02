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
 * 매처는 **토큰이 실제로 필요한 두 경로만** 잡는다 — '내 신청'과 행사 신청이다.
 *
 * updateSession()은 요청마다 Supabase를 한 번 왕복한다. 이 앱의 본체(행사 목록·상세)는 익명
 * 공개라 세션이 필요 없고, 링크 공유로 들어오는 트래픽이 대부분이라 거기에 왕복을 붙이면
 * 로그인하지 않는 사람들이 비용을 대신 낸다. **행사 상세(`/events/{id}`)는 여전히 제외이고
 * 신청(`/events/{id}/apply`)만 잡는다** — 매처를 `/events/:path*`로 넓히면 공유 링크로 들어온
 * 모든 조회에 세션 조회가 붙는다.
 *
 * 신청 화면을 넣는 이유는 두 가지다. 서버 컴포넌트가 쿠키의 토큰으로 회원 여부를 판정하고
 * (`entities/session`), 그 뒤 브라우저가 같은 세션으로 자동 저장·제출을 이어 간다 — 만료가
 * 임박한 토큰이 여기서 갱신되지 않으면 작성 도중에 저장이 401로 끊긴다.
 *
 * /auth/callback은 제외한다 — 콜백 라우트가 스스로 코드를 세션으로 교환하며, 그 시점에는
 * 아직 갱신할 세션이 없다.
 */
export const config = {
  matcher: ["/my-applications", "/events/:eventId/apply"],
};
