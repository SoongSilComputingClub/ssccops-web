import type { Metadata } from "next";
import { MyApplicationsPage } from "@/views/my-applications";

/**
 * /my/applications — 기획안 제출 현황 (#171).
 *
 * `app/`은 라우팅 전용이다 — 뷰(`views/my-applications`)를 얇게 감싼다. 대상은 언제나 로그인한
 * 본인이라 주소 파라미터가 없고, 화면이 진입할 때 기획안 폼을 코드(`sys_form_cd = 'PROPOSAL'`)로
 * 찾는다.
 *
 * 로그인 본인의 데이터라 캐시하지 않는다(`shared/api/client.ts`가 no-store).
 */
export const metadata: Metadata = {
  title: "기획안 제출 현황",
};

export default function Page() {
  return <MyApplicationsPage />;
}
