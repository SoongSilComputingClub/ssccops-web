/*
 * 콘텐츠 페이지 슬러그 — 표는 `@ssccops/content`에 있다 (#520 → #534 · ssccops#392).
 *
 * 어드민이 같은 표로 페이지 카탈로그를 그리게 되면서 패키지로 올렸다(«둘 이상» 규칙). 여기는
 * 재export뿐이다. 새 페이지 종류는 패키지 표에 한 줄 + 이 앱의 라우트 — 어드민은 표를 읽어
 * 자동으로 줄이 생긴다.
 *
 * 역대 운영진의 대수 표(`OPERATOR_COHORTS`)는 #571에서 없앴다 — 손으로 적는 상수라 43대 페이지가
 * 게시돼 있어도 화면에 길이 없었다. 지금은 서버 목록(`fetchPublicPageSummaries("operators-")`)이
 * 답한다(`views/content-page/model/operators-tabs.ts`).
 */
export {
  CONTENT_SLUG,
  type ContentSlug,
  OPERATORS_SLUG_PREFIX,
  isCohort,
  operatorsCohortSlug,
  parseOperatorsCohort,
} from "@ssccops/content";
