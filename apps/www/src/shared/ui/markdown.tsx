/*
 * 본문 렌더러 둘 — 구현은 `@ssccops/ui`에 있다 (ssccops#243). `Markdown`은 행사 본문(lms와 공유),
 * `ContentMarkdoc`은 콘텐츠 페이지·포스트(레이아웃 태그 · ADR-0039).
 *
 * www·lms에 같은 사본이 있었다. 원시 HTML을 해석하지 않는다는 안전 판단이 두 벌로 있으면
 * 한쪽만 뒤집혀도 아무도 모른다.
 */
export { Markdown, ContentMarkdoc } from "@ssccops/ui";
