import { Suspense } from "react";
import { EventListPage } from "@/views/event-list";

/*
 * 목록 화면이 필터를 URL 쿼리에서 읽는다(useSearchParams). 이 훅은 프리렌더 시점에 쿼리를
 * 알 수 없어 Suspense 경계를 요구하므로 여기서 감싼다 — 없으면 빌드가 CSR bailout으로 실패한다.
 */
export default function Page() {
  return (
    <Suspense>
      <EventListPage />
    </Suspense>
  );
}
