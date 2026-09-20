/*
 * 다른 앱으로 가는 링크 — 상단 바·드로어 발치의 «홈페이지» (#577 · ssccops#430).
 *
 * www의 주소는 `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`이다 — 공유 링크 발급(`entities/share`)이 www
 * 오리진으로 이미 쓰는 변수이고(ADR-0017의 재사용), 이름이 쓰임새보다 좁아진 빚은 그쪽 주석
 * 그대로다. 값이 비면 항목을 **그리지 않는다** — 죽은 주소로 보내지 않는다. 새 env는 없다.
 *
 * `nav-links.ts`의 묶음에 섞지 않는 것은 저쪽이 이 앱의 화면 목차(역할·`isActive`)이기 때문이다.
 */
export interface SiteLink {
  label: string;
  href: string;
}

export function siteLinks(): SiteLink[] {
  // `/\/+$/`는 되돌아가는 정규식이지만 입력이 배포 설정값이라 닿을 일이 없다 (#401 · S8786)
  const www = process.env.NEXT_PUBLIC_PUBLIC_FORM_ORIGIN?.replace(/\/+$/, "") || null;
  return www ? [{ label: "홈페이지", href: www }] : [];
}
