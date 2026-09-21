/**
 * 구조화 데이터 한 덩이 — `<script type="application/ld+json">` (#602 · ssccops#444).
 *
 * 값은 서버 컴포넌트가 만든 객체이고 `@context`는 여기서 붙인다(부르는 쪽이 매번 적지 않게).
 * `JSON.stringify` 결과의 `<`를 `<`로 바꾸는 것은 XSS 규칙이다 — 본문·제목은 운영진이
 * 쓰는 값이지만 `</script>`가 섞이면 스크립트가 닫히고 그 뒤가 HTML로 해석된다. JSON 안의
 * `<`는 파서가 `<`로 되돌리므로 데이터는 그대로다(Next 문서의 권고와 같다).
 */
export function JsonLd({ data }: Readonly<{ data: Record<string, unknown> }>) {
  const json = JSON.stringify({ "@context": "https://schema.org", ...data }).replace(
    /</g,
    "\\u003c",
  );
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
