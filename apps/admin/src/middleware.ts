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
 * - auth/* — OAuth 콜백. 라우트 핸들러가 직접 코드를 교환하며 가드 대상이 아니다
 *
 * f/* 는 예전에 여기서 빠져 있었다. 공개 폼을 로그인 없이 열게 하려던 것인데, 응답자를
 * 회원으로 식별하기로 하면서(form_rspns_hstry.mbr_id NOT NULL) 전제가 뒤집혔다.
 * 매처에서 빠져 있으면 미들웨어 자체가 돌지 않아 proxy.ts의 isPublicPath를 아무리 고쳐도
 * 효과가 없으므로, 두 곳을 함께 되돌린다.
 *
 * 대가는 분명하다 — 공개 폼 요청마다 getUser() 왕복이 하나씩 붙는다. 그래도 링크를 받은
 * 사람을 인증 없이 폼까지 들여보내면 제출 시점에야 로그인으로 튕겨 작성한 답이 날아가므로,
 * 입구에서 한 번 걸러 내는 쪽을 택했다.
 */
/*
 * `.webmanifest`가 목록에 있는 이유 (#110).
 *
 * 매니페스트가 여기서 빠지면 미들웨어가 돌아 미인증 요청을 /login으로 돌려보낸다. 그러면
 * 브라우저는 JSON 대신 로그인 HTML을 받아 파싱에 실패하고 **설치 후보로 잡지 못한다** —
 * PWA 설치가 통째로 막힌다. 실제로 그렇게 배포됐다가 잡았다.
 *
 * 매니페스트는 비밀이 없는 공개 자산이라 인증 판단이 필요 없고, 매처에서 빼면 요청마다
 * 붙던 Supabase 왕복도 함께 없어진다.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
