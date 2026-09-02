import { Suspense } from "react";
import { ProposalReviewListPage } from "@/views/proposal-review";

/*
 * 목록이 상태 필터를 쿼리스트링에서 읽는다(`?statusCode=`). 서버 렌더 시점에는 그 값을 알 수
 * 없어 Suspense 경계를 요구하므로 여기서 감싼다 — 없으면 빌드가 CSR bailout으로 실패한다.
 */
export default function Page() {
  return (
    <Suspense>
      <ProposalReviewListPage />
    </Suspense>
  );
}
