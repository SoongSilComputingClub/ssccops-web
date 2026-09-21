import type { Metadata } from "next";
import { MeProgramsPage } from "@/views/me";

/**
 * 이끄는 프로그램 — 내 활동의 내부 페이지 (#574 · ssccops#428). 허브 `/me`와 같은 이유로 색인하지
 * 않는다 — 본인만 보는 화면이고 로그인 없이는 안내만 보이는 껍데기다. OG 메타도 없다.
 * 상태 필터가 없어 쿼리를 읽지 않는다(`views/me/ui/me-programs-page.tsx`).
 */
export const metadata: Metadata = {
  title: "이끄는 프로그램",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <MeProgramsPage />;
}
