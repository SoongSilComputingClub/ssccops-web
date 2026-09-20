import { SystemFormListPage } from "@/views/system-form-list";

/*
 * 폼 목록(`../page.tsx`)과 달리 `Suspense`로 감싸지 않는다 — 이 화면은 필터를 URL 쿼리에서
 * 읽지 않아 `useSearchParams`를 쓰지 않는다(근거는 뷰의 머리말). 지운 폼(`../deleted`)과 같은 판단.
 */
export default function Page() {
  return <SystemFormListPage />;
}
