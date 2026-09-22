/*
 * 다른 앱으로 가는 링크 — 계정 메뉴 절 ④ «다른 앱» (#577 · ssccops#430 → #614 · ssccops#452: 발치의 «사이트» 행에서 계정 메뉴 안으로).
 *
 * 세 앱은 서로의 주소를 **배포 설정값**으로만 안다 — www는 `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`
 * (이름이 쓰임새보다 좁아진 빚은 `routes.ts`의 `publicFormUrl` 주석 그대로 — ADR-0017이 그
 * 변수를 www 오리진으로 재사용했다), lms는 `NEXT_PUBLIC_LMS_ORIGIN`(`lms-routes.ts`). 값이 비면
 * 그 항목을 **그리지 않는다** — 죽은 주소로 보내지 않는다는 규칙이 여기도 같다. 새 env는 없다.
 *
 * 메뉴 항목(`nav.ts`)이 아니라 따로 두는 것은 저쪽이 «이 앱의 화면 목차»이고 `isActive`·권한
 * 판정이 붙기 때문이다 — 외부 앱에는 둘 다 없다.
 */
import { lmsOrigin } from "./lms-routes";

export interface SiteLink {
  label: string;
  href: string;
}

function wwwOrigin(): string | null {
  // `/\/+$/`는 되돌아가는 정규식이지만 입력이 배포 설정값이라 닿을 일이 없다 (#401 · S8786)
  return process.env.NEXT_PUBLIC_PUBLIC_FORM_ORIGIN?.replace(/\/+$/, "") || null;
}

/** 설정된 오리진만 — 순서는 부원이 보는 순서(홍보 사이트 → 학술) */
export function siteLinks(): SiteLink[] {
  const links: SiteLink[] = [];
  const www = wwwOrigin();
  const lms = lmsOrigin();
  if (www) links.push({ label: "홍보 사이트", href: www });
  if (lms) links.push({ label: "학술 LMS", href: lms });
  return links;
}

/**
 * 앱 코드(서버 `app_cd`) → 오리진 — 서비스워커가 다른 앱의 알림을 눌렀을 때 열 곳 (#604 · ADR-0045).
 *
 * 위 `siteLinks()`와 같은 두 값이고 같은 규칙(비면 없다)이다 — 없으면 워커가 자기 `/notifications`로
 * 연다. 키가 `PushApp`(`@ssccops/pwa`)과 같은 글자인 것은 페이로드의 `app`으로 바로 찾기 위해서다.
 */
export function appOrigins(): { LMS?: string; WWW?: string } {
  const origins: { LMS?: string; WWW?: string } = {};
  const www = wwwOrigin();
  const lms = lmsOrigin();
  if (www) origins.WWW = www;
  if (lms) origins.LMS = lms;
  return origins;
}
