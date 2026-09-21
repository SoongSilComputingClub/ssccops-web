import type { Metadata } from "next";
import { MyAccountPage } from "@/views/my-account";

/**
 * /my — 내 정보 (#606 · ADR-0045). `app/`은 라우팅 전용 — 뷰를 얇게 감싼다.
 *
 * 로그인 본인의 세션을 읽으므로 캐시하지 않는다(`shared/api/client.ts`와 같은 태도).
 */
export const metadata: Metadata = {
  title: "내 정보",
};

export default function Page() {
  return <MyAccountPage />;
}
