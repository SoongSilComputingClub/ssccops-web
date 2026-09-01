import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadLanding } from "@/features/academic-program/model/load-landing";
import { ROUTES } from "@/shared/config/routes";
import { LandingPage } from "@/views/landing";

/**
 * 루트 라우트 — 첫 화면 (#226).
 *
 * 전에는 `/studio`로 곧장 넘겼다(#169). 상단 바가 역할별로 갈리고 나니(#224) 일반 회원의
 * 첫 화면이 "학술 대시보드"라는 제목 아래 "맡고 있는 스터디·프로젝트가 없습니다"만 뜨는
 * 상태가 되어, 여기서 갈 곳을 고르게 한다.
 *
 * **스터디장은 지나친다.** 매일 대시보드를 여는 사람에게 카드를 한 번 더 누르게 하지 않는다.
 * 이 분기가 역할을 보는 **유일한 자리**다 — 뷰는 역할을 묻지 않고 로더 결과를 받아 그리기만
 * 한다.
 *
 * **로더는 여기서 한 번만 부르고 결과를 뷰에 넘긴다.** 페이지와 뷰가 각자 부르면 요청이 실제로
 * 두 번 나간다 — 이 앱의 `apiFetch`는 `cache: "no-store"`라(`shared/api/client.ts`) Next의
 * fetch 중복 제거가 걸리지 않는다. 다른 뷰들이 자기 로더를 직접 부르는 것과 갈리는 자리이고,
 * 갈리는 이유는 여기만 **로더 결과로 리다이렉트까지** 하기 때문이다.
 */
export const metadata: Metadata = {
  title: "SSCC 학술",
};

export default async function Page() {
  const result = await loadLanding();
  if (result.outcome === "leader") redirect(ROUTES.studio);

  return <LandingPage result={result} />;
}
