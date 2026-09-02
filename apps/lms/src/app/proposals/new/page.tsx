import type { Metadata } from "next";
import { ProposalNewPage } from "@/views/proposal-new";

/**
 * /proposals/new — 기획안 신규 작성 (#185).
 *
 * `app/`은 라우팅 전용이다 — 뷰(`views/proposal-new`)를 얇게 감싼다. 주소에 폼 번호가 없다
 * (`sys_form_cd = 'PROPOSAL'`이 가리키는 시스템 폼을 화면이 코드로 찾는다 · `routes.ts`).
 *
 * 로그인 본인의 데이터라 캐시하지 않는다(`shared/api/client.ts`가 no-store).
 */
export const metadata: Metadata = {
  title: "기획안 작성",
};

export default function Page() {
  return <ProposalNewPage />;
}
