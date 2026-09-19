/*
 * 콘텐츠 페이지 슬러그 — 표는 `@ssccops/content`에 있다 (#520 → #534 · ssccops#392).
 *
 * 어드민이 같은 표로 페이지 카탈로그를 그리게 되면서 패키지로 올렸다(«둘 이상» 규칙). 여기는
 * 재export와 www만의 값(`OPERATOR_COHORTS`)뿐이다. 새 페이지 종류는 패키지 표에 한 줄 + 이 앱의
 * 라우트 — 어드민은 표를 읽어 자동으로 줄이 생긴다.
 */
export {
  CONTENT_SLUG,
  type ContentSlug,
  isCohort,
  operatorsCohortSlug,
} from "@ssccops/content";

/**
 * 역대 운영진 페이지가 게시된 기수 — 운영진 축의 «역대» 탭이 첫 항목으로 간다 (#524).
 *
 * **손으로 적는 표다.** 서버에 «게시된 페이지 목록» 익명 API가 없어(ADR-0038 — 슬러그 하나씩만
 * 읽는다) 기수를 훑어 알아낼 길이 없고, 슬러그 `operators-1`부터 차례로 찔러 보는 것은 요청
 * 수십 개를 한 화면에 얹는 일이라 기각했다. 홍보국이 새 기수 페이지를 게시하면 여기에 한 줄
 * 더한다 — 표에 없는 기수도 주소(`/operators/43`)로는 열린다. 최신 기수가 앞이다.
 */
export const OPERATOR_COHORTS: readonly number[] = [44];
