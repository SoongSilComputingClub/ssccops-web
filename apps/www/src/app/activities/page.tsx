import type { Metadata } from "next";
import { CURSOR_QUERY } from "@/shared/config/routes";
import { ActivitiesPage } from "@/views/activities";

export const metadata: Metadata = {
  title: "활동",
  description: "SSCC의 학술·행사·뉴스 기록",
};

export default async function Page({ searchParams }: Readonly<PageProps<"/activities">>) {
  const params = await searchParams;
  const raw = params[CURSOR_QUERY];
  // 같은 키가 두 번 실리면 배열로 온다 — 첫 값만 쓴다(홈의 분류 필터와 같다)
  const cursor = (Array.isArray(raw) ? raw[0] : raw) || null;

  return <ActivitiesPage category={null} cursor={cursor} />;
}
