import type { NextRequest } from "next/server";
import { updateSession } from "@ssccops/auth/supabase/proxy";

/*
 * Next.js 16은 middleware.ts를 proxy.ts로 대체했지만, @opennextjs/cloudflare가 아직
 * proxy.ts 컨벤션을 인식하지 못해 빌드가 깨진다 (opennextjs/opennextjs-cloudflare#962).
 * 어드민과 같은 이유로 구 컨벤션(middleware.ts / export function middleware)을 유지한다.
 */
/*
 * **가드를 주지 않는다**(ssccops-web#329). `updateSession`은 두 번째 인자로 `SessionGuard`를
 * 받으면 미인증 요청을 로그인 화면으로 밀어내지만, 이 앱에는 밀어낼 로그인 화면이 없다 —
 * 인자를 비우면 세션 쿠키 갱신만 하고 끝난다. 그 판단의 근거는 아래 매처 주석에 있다.
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
 * **공개 폼(`/f/{formId}`)이 같은 이유로 들어온다**(ssccops#214). 답을 고칠 때마다 저장하는
 * 화면이고 한 번에 오래 머무르므로, 갱신이 없으면 긴 폼일수록 마지막에 401을 만난다.
 * 완료 화면(`/f/{id}/done`)까지 잡지 않는 것은 그쪽이 아무것도 조회하지 않기 때문이다.
 *
 * **크롤러를 가려낼 필요가 없다.** 어드민에서는 미들웨어가 미인증 요청을 `/login`으로 돌려보내
 * `generateMetadata`가 아예 돌지 않았고, 그래서 UA로 크롤러를 골라 통과시키는 장치가 있었다
 * (ssccops-web#269). 여기서는 `updateSession`이 리다이렉트를 하지 않으므로 우회할 대상 자체가
 * 없다 — 크롤러는 그냥 페이지를 받고 메타가 만들어진다.
 *
 * /auth/callback은 제외한다 — 콜백 라우트가 스스로 코드를 세션으로 교환하며, 그 시점에는
 * 아직 갱신할 세션이 없다.
 *
 * **공유 링크 착지(`/s/{token}`)도 여기 없고, 없는 것이 맞다**(ssccops#253 · ADR-0017).
 * 어드민에서는 미들웨어가 미인증 요청을 `/login`으로 밀어내므로 그 경로를 가드의
 * `PUBLIC_PATHS`에 넣어야 했다 — 넣지 않으면 `generateMetadata`가 아예 돌지 않고, **크롤러는
 * 정의상 미인증**이라 카드가 통째로 만들어지지 않는다. 이 앱에는 그 목록도 리다이렉트도
 * 없으므로(위 `updateSession(request)` — 가드 없음) 예외를 적을 자리가 없고, 매처가 잡지
 * 않아 세션 왕복도 붙지 않는다. 익명 미리보기만 그리는 화면이라 세션이 필요하지도 않다.
 *
 * **그래서 매처를 넓힐 때 이 자리가 함께 걸린다.** 언젠가 이 앱에 로그인 화면이 생겨
 * 가드를 주게 되면 `/s`를 공개 경로로 먼저 적어야 한다 — 그 전에는 매처를 `/((?!...).*)`
 * 같은 포괄 패턴으로 바꾸는 것만으로도 착지 요청마다 Supabase 왕복이 붙는다.
 */
export const config = {
  matcher: ["/my-applications", "/events/:eventId/apply", "/f/:formId"],
};
