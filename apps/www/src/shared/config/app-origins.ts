import { withoutTrailingSlash } from "@/shared/lib/origin";
import { lmsOrigin } from "./lms-routes";

/*
 * 앱 코드(서버 `app_cd`) → 오리진 — **알림이 다른 앱을 가리킬 때만** 쓴다 (#616 · ssccops#453 · ADR-0045).
 *
 * 알림은 회원 단위라(ssccops#448) 운영진 계정으로 www에 로그인하면 어드민 사건(승인 요청·결과)이 같은
 * 목록에 온다. 그 행을 누르면 어드민으로, 서비스워커의 `notificationclick`도 같은 곳으로 가야 한다 —
 * 그래서 이 표는 서비스워커(`app/sw.js/route.ts`)와 목록(`features/notification` `notificationTarget`)이
 * 함께 읽는다. 키가 `PushApp`(`@ssccops/pwa`)과 같은 글자인 것은 페이로드의 `app`으로 바로 찾기 위해서다.
 *
 * ── 어드민 오리진이 이 앱에 돌아온 이유 ─────────────────────
 * `NEXT_PUBLIC_ADMIN_ORIGIN`은 #451에서 걷어냈다 — 부원에게 나가는 **화면**이 운영 도메인을 가리키지
 * 않는다. 그 규칙은 그대로다: 이 값은 화면 링크·CTA·메뉴에 쓰지 않고, 본인이 받은 알림 행(운영진만
 * 받는다)을 눌렀을 때 그 알림이 가리키는 곳으로 보내는 데만 쓴다. 값이 비면 워커는 자기 `/notifications`로
 * 열고 목록의 행은 글자만 남는다(죽은 주소 금지 — `lms-routes.ts`와 같은 판단). LMS는 `lmsOrigin()`
 * 그대로다 — 남의 앱 주소는 그 파일이 정본이고 여기서는 표로 묶기만 한다.
 */

export function adminOrigin(): string | null {
  return withoutTrailingSlash(process.env.NEXT_PUBLIC_ADMIN_ORIGIN) || null;
}

export function appOrigins(): { ADMIN?: string; LMS?: string } {
  const origins: { ADMIN?: string; LMS?: string } = {};
  const admin = adminOrigin();
  const lms = lmsOrigin();
  if (admin) origins.ADMIN = admin;
  if (lms) origins.LMS = lms;
  return origins;
}
