import type { NextRequest } from "next/server";
import { updateSession } from "@/shared/lib/supabase/proxy";

/*
 * Next.js 16은 middleware.ts를 proxy.ts로 대체했지만, @opennextjs/cloudflare가 아직
 * proxy.ts 컨벤션을 인식하지 못해 빌드가 깨진다 (opennextjs/opennextjs-cloudflare#962).
 * 어드민·www와 같은 이유로 구 컨벤션(middleware.ts / export function middleware)을 유지한다 —
 * 어드민이 한 번 proxy.ts로 옮겼다 되돌린 이력이 있다.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

/*
 * 매처가 **전 화면**을 잡는다 — apps/www와 정반대다.
 *
 * apps/www는 익명 공개가 본체라 매처를 로그인 화면 둘로 좁혔다(공유 링크 조회마다 Supabase
 * 왕복이 붙는 것을 막으려고). 이 앱은 다르다 — 학술 공개 앱은 대시보드·내 활동·회차 기록까지
 * 전부 로그인 필수이고 익명으로 여는 화면이 없다(#169). 좁힐 이유가 없으므로 정적 자산만
 * 빼고 모든 경로에서 세션 쿠키를 갱신한다.
 *
 * updateSession()은 **가드가 아니다**(shared/lib/supabase/proxy.ts) — 하는 일은 만료가 임박한
 * access token을 새로 고쳐 쿠키에 심는 것 하나뿐이고, "로그인했는가"의 판단과 안내는 각
 * 화면(과 공용 로그인 게이트)이 한다. 이 앱에는 밀어낼 로그인 화면이 없어(로그인은 지금 보고
 * 있는 화면 위에서 시작한다) 미들웨어에서 리다이렉트를 걸지 않는다 — apps/www가 세운 규약을
 * 잇는다.
 *
 * 매처 패턴은 어드민(apps/admin)의 검증된 모양을 그대로 쓴다. _next 정적 자산·favicon·파일
 * 확장자가 붙은 요청(아이콘·`.webmanifest` 포함)과 `auth/`(OAuth 콜백)를 뺀다 — 콜백 라우트가
 * 스스로 코드를 세션으로 교환하며 그 시점에는 아직 갱신할 세션이 없다. `.webmanifest`를 빼는
 * 이유는 어드민 #110과 같다 — 매니페스트가 매처에 걸리면 미인증 요청에 HTML이 실려 PWA
 * 설치 후보로 잡히지 않는다(이 앱은 미들웨어에서 리다이렉트하지 않지만, 매처에서 빼면 요청마다
 * 붙는 Supabase 왕복도 함께 없어진다).
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
