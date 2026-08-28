import type { Metadata } from "next";
import { MyProgramsPage } from "@/views/my-programs";

/**
 * /studio/programs — 내 활동 목록 (#188).
 *
 * `app/`은 라우팅 전용이다 — 뷰(`views/my-programs`)를 얇게 감싼다. 대상은 언제나 로그인한
 * 본인이 맡은 활동이라 주소 파라미터가 없다.
 *
 * 로그인 본인의 데이터라 캐시하지 않는다(`shared/api/client.ts`가 no-store).
 */
export const metadata: Metadata = {
  title: "내 활동",
};

export default function Page() {
  return <MyProgramsPage />;
}
