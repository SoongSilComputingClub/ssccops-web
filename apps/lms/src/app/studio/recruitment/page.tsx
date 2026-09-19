import type { Metadata } from "next";
import { StudioRecruitmentPage, toPhaseFilter } from "@/views/studio-recruitment";

/**
 * /studio/recruitment — 모집 관리 (#528).
 *
 * `app/`은 라우팅 전용이다 — 뷰를 얇게 감싼다. **활동 번호를 받지 않는다**: 이 화면은 내가
 * 맡은 활동 전부의 모집 상태를 보는 목록이고, 활동 하나를 고르는 것은 카드의 «지원서 문항
 * 편집»이 한다.
 *
 * `?phase=`는 접수 상태 필터다(없으면 전체). 거르는 대상이 이미 서버에서 받아 온 배열이라
 * 주소에만 남기고 재조회하지 않는다.
 */
export const metadata: Metadata = {
  title: "모집 관리",
};

export default async function Page({
  searchParams,
}: Readonly<PageProps<"/studio/recruitment">>) {
  const params = await searchParams;
  return <StudioRecruitmentPage phase={toPhaseFilter(params.phase)} />;
}
