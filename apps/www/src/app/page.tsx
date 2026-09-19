import { HomePage } from "@/views/home";

/*
 * 홈 — «지금 SSCC» (#524 · ssccops#385). 행사 목록이던 첫 화면(#141)은 `/events`로 갔다.
 * 쿼리를 읽지 않는다 — 분류 필터(`?clsf=`)는 행사 목록의 것이고 그쪽 라우트가 받는다.
 */
export default function Page() {
  return <HomePage />;
}
