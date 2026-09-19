/*
 * 본문 렌더러 둘 — 구현은 `@ssccops/ui`에 있다 (ssccops#243). `Markdown`은 행사 본문,
 * `ContentMarkdoc`은 콘텐츠 페이지·포스트(레이아웃 태그 · ADR-0039 · #532).
 *
 * 어드민이 이것을 쓰는 자리는 **입력 미리보기** 하나다(`shared/ui/markdown-editor.tsx`).
 * 미리보기 전용 렌더러를 따로 두지 않는 이유가 이 재export의 전부다 — 두 벌이면 "미리보기는
 * 맞는데 실제가 다른" 상태가 생기고, 그것은 미리보기가 없는 것보다 나쁘다.
 * 공개 앱(apps/www)도 같은 모양으로 이 패키지를 가리킨다.
 */
export { Markdown, ContentMarkdoc, validateContentMarkdoc, CONTENT_TAG_SNIPPETS } from "@ssccops/ui";
