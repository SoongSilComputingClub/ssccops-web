import type { SessionGuard } from "@ssccops/auth/supabase/proxy";
import { ROUTES } from "@/shared/config/routes";

/*
 * 이 앱의 미들웨어 가드 — 세션 갱신은 `@ssccops/auth/supabase/proxy`가 하고, 여기 있는 것은
 * **admin만 갖는 값**이다(ssccops-web#329). www·lms는 밀어낼 로그인 화면이 없어 가드를
 * 주지 않는다.
 *
 * 미들웨어가 가르는 것은 "인증됐는가" 하나다.
 *
 * "가입했는가"까지 여기서 판정하려면 요청마다 ssccops-server 세션 조회가 하나씩 붙는다
 * (Cloudflare Workers 배포에서 지연·비용에 직결된다). 그래서 가입 여부 분기는 세션을 이미
 * 들고 있는 클라이언트 게이트(AuthGate · SignupGate)에 맡긴다.
 *
 * /signup·/signup/complete는 더 이상 공개 경로가 아니다 — 인증은 필요하되 가입 완료 여부는
 * SignupGate가 가른다. 예전에는 PUBLIC_PATHS에 있어 미인증 사용자도 가입 화면을 통과했다.
 *
 * **공개 폼(`/f/{formId}`)은 이제 이 앱에 없다**(ssccops#214 — `apps/www`로 옮겼다). 그 이력을
 * 남겨 두는 것은 같은 자리를 두 번 뒤집었기 때문이다: 처음에는 공개 경로였다가, 응답자를
 * 회원으로 식별하기로 하면서(`form_rspns_hstry.mbr_id` NOT NULL) 보호 대상으로 되돌렸고
 * — 미인증으로 들여보내면 답을 다 쓴 뒤 제출에서 튕겨 **작성한 답이 날아간다** — 그 뒤
 * 공유 카드를 위해 크롤러 UA만 통과시키는 예외를 뒀다(ssccops-web#269). 옮겨 간 앱에는
 * 리다이렉트하는 미들웨어가 없어 그 예외도 필요 없어졌고, 함께 지웠다.
 */
/*
 * 미인증 요청을 /login으로 돌려보내지 않는 경로.
 *
 * `/s`(공유 링크 착지, ssccops#200)가 여기 있는 것은 **크롤러가 정의상 미인증**이기
 * 때문이다. 리다이렉트되면 generateMetadata가 아예 돌지 않아 OG 카드가 통째로 만들어지지
 * 않는다. 대신 그 화면은 제목 한 줄만 그리고 곧바로 상세로 보내므로, 인증 없이 열려 있어도
 * 새는 것이 없다 — 실제 내용이 있는 상세는 종전대로 여기서 지킨다.
 *
 * **이 목록이 공유 패키지로 올라가지 않은 이유가 그것이다** — 앱마다 다른 값이지 세 앱이
 * 함께 볼 규칙이 아니다.
 */
const PUBLIC_PATHS: string[] = [ROUTES.login, "/s"];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/auth/")) return true;
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export const ADMIN_SESSION_GUARD: SessionGuard = {
  loginPath: ROUTES.login,
  fallbackPath: ROUTES.dashboard,
  isPublicPath,
};
