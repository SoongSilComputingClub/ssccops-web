import type { Metadata } from "next";
import { LOGIN_ERROR_QUERY } from "@/shared/config/routes";
import { MyApplicationsPage } from "@/views/my-applications";

/**
 * 본인만 보는 화면이라 색인하지 않는다.
 *
 * 공개 앱의 다른 화면(목록·상세)은 공유·검색으로 찾아오는 것이 목적이지만, 이 화면은 로그인
 * 없이는 안내만 보이는 껍데기다 — 검색 결과에 서면 "내 신청"을 눌러 온 사람이 남의 화면을
 * 여는 것처럼 느낀다. OG 메타도 두지 않는다(공유할 것이 없다).
 */
export const metadata: Metadata = {
  title: "내 신청",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: PageProps<"/my-applications">) {
  const params = await searchParams;
  const raw = params[LOGIN_ERROR_QUERY];
  // 같은 키가 두 번 실리면 배열로 온다 — 사유는 하나뿐이므로 첫 값만 읽는다
  const loginError = (Array.isArray(raw) ? raw[0] : raw) || null;

  return <MyApplicationsPage loginError={loginError} />;
}
