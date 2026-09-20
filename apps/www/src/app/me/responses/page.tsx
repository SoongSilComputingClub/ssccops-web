import type { Metadata } from "next";
import { ME_STATUS_QUERY } from "@/shared/config/routes";
import { MeResponsesPage } from "@/views/me";

/**
 * 낸 폼 — 내 활동의 내부 페이지 (#574 · ssccops#428). 허브 `/me`와 같은 이유로 색인하지
 * 않는다 — 본인만 보는 화면이고 로그인 없이는 안내만 보이는 껍데기다. OG 메타도 없다.
 */
export const metadata: Metadata = {
  title: "낸 폼",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: Readonly<PageProps<"/me/responses">>) {
  const params = await searchParams;
  const raw = params[ME_STATUS_QUERY];
  // 같은 키가 두 번 실리면 배열로 온다 — 필터는 하나뿐이므로 첫 값만 읽는다
  const status = (Array.isArray(raw) ? raw[0] : raw) || null;

  return <MeResponsesPage status={status} />;
}
