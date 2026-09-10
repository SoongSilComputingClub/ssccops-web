import { DeletedFormListPage } from "@/views/deleted-form-list";

/*
 * 폼 목록(`../page.tsx`)과 달리 `Suspense`로 감싸지 않는다 — 이 화면은 필터를 URL 쿼리에서
 * 읽지 않아 `useSearchParams`를 쓰지 않는다(근거는 뷰의 머리말). 쓰지 않는 훅 때문에 경계를
 * 두면 다음 사람이 그것을 규칙으로 읽는다.
 */
export default function Page() {
  return <DeletedFormListPage />;
}
