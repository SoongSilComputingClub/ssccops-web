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

/**
 * 일시TS → "2026-08-28 19:00" — 서버가 준 `OffsetDateTime` 문자열의 앞 16자를 잘라 쓴다.
 *
 * `formatYmd`와 같은 판단이다 — `new Date(...)`로 파싱해 로컬 시간대로 그리면 서울 밖에서
 * 열었을 때 다른 시각이 보인다. 검토 이력의 처리 일시가 서버 응답에서 Asia/Seoul 오프셋을
 * 달고 오므로(`FormResponseReviewHistoryResponse`) 앞 16자가 곧 서비스 시간대의 값이다.
 * 값이 없거나 모양이 어긋나면 빈 문자열(추측하지 않는다).
 */
export function formatDt(value: string | null | undefined): string {
  if (!value) return "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return "";
  return value.slice(0, 16).replace("T", " ");
}

/**
 * 오늘 날짜(Asia/Seoul) — "YYYY-MM-DD".
 *
 * 회차 기록 작성 화면의 '실제 진행일' 입력 기본값으로 쓴다 — 브라우저의 로컬 시간대가 아니라
 * 서비스 시간대로 센다(어드민 `todayInSeoul`과 같은 판단). 해외에서 접속한 스터디장에게 하루가
 * 어긋나면 안 된다.
 */
export function todayInSeoul(): string {
  // sv-SE 로케일이 ISO와 같은 YYYY-MM-DD 표기를 준다
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}
