/*
 * 다른 앱으로 가는 링크 — 상단 바·드로어 발치의 «홈페이지» (#577 · ssccops#430).
 *
 * www의 주소는 `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`이다 — 공유 링크 발급(`entities/share`)이 www
 * 오리진으로 이미 쓰는 변수이고(ADR-0017의 재사용), 이름이 쓰임새보다 좁아진 빚은 그쪽 주석
 * 그대로다. 값이 비면 항목을 **그리지 않는다** — 죽은 주소로 보내지 않는다.
 *
 * `nav-links.ts`의 묶음에 섞지 않는 것은 저쪽이 이 앱의 화면 목차(역할·`isActive`)이기 때문이다.
 */
export interface SiteLink {
  label: string;
  href: string;
}

// `/\/+$/`는 되돌아가는 정규식이지만 입력이 배포 설정값이라 닿을 일이 없다 (#401 · S8786)
function wwwOrigin(): string | null {
  return process.env.NEXT_PUBLIC_PUBLIC_FORM_ORIGIN?.replace(/\/+$/, "") || null;
}

/**
 * 어드민 오리진 — `NEXT_PUBLIC_ADMIN_ORIGIN`(#606 · ADR-0045 · **이 앱의 새 env**). 화면 링크에는 쓰지
 * 않는다(#453 — 부원에게 운영 도메인을 보이지 않는다). 쓰는 곳은 알림 하나다: 운영진이 lms에서
 * 어드민 알림(승인 요청·결과)을 눌렀을 때 그리로 연다. 비면 워커·목록 모두 머문다.
 */
function adminOrigin(): string | null {
  return process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.replace(/\/+$/, "") || null;
}

export function siteLinks(): SiteLink[] {
  const www = wwwOrigin();
  return www ? [{ label: "홈페이지", href: www }] : [];
}

/**
 * 앱 코드(서버 `app_cd`) → 오리진 — 서비스워커가 다른 앱의 알림을 눌렀을 때 열 곳 (#606 · ADR-0045).
 *
 * www는 `siteLinks()`와 같은 값, admin은 `NEXT_PUBLIC_ADMIN_ORIGIN`. 같은 규칙(비면 없다)이다 — 없으면
 * 워커는 자기 `/notifications`로 열고 목록의 행은 머문다(`features/notification` `notificationTarget`).
 * 키가 `PushApp`(`@ssccops/pwa`)과 같은 글자인 것은 페이로드의 `app`으로 바로 찾기 위해서다.
 */
export function appOrigins(): { ADMIN?: string; WWW?: string } {
  const origins: { ADMIN?: string; WWW?: string } = {};
  const admin = adminOrigin();
  const www = wwwOrigin();
  if (admin) origins.ADMIN = admin;
  if (www) origins.WWW = www;
  return origins;
}
