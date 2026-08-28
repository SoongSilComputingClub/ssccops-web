/**
 * 학술 일시 표기.
 *
 * 서버는 모든 일시를 서비스 시간대(Asia/Seoul)의 `OffsetDateTime`으로 준다
 * ("2026-03-01T00:00:00+09:00"). **문자열을 잘라 쓴다** — `new Date(...)`로 파싱해
 * 브라우저·워커의 로컬 시간대로 그리면, 서울 밖에서 열었을 때 같은 날짜가 다른 값으로 보인다
 * (apps/www `shared/lib/date.ts`와 같은 판단).
 */

/** 일시TS·일자D → "2026. 3. 1." · 값이 없거나 모양이 어긋나면 빈 문자열(추측하지 않는다) */
export function formatYmd(value: string | null | undefined): string {
  if (!value) return "";
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!matched) return "";
  const [, y, m, d] = matched;
  return `${Number(y)}. ${Number(m)}. ${Number(d)}.`;
}
