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

/**
 * `today`(YYYY-MM-DD)가 속한 주(월요일 시작)의 [시작, 끝] 일자.
 *
 * "이번 주" 판정을 서버가 내려주지 않으므로(스터디장 대시보드 #126) 회차 목록을 이 범위로
 * 거른다 — 기준일은 `todayInSeoul()`이다. 프로토타입의 고정 기준일(2026-08-21)을 쓰면 이미
 * 지난 회차가 미래로 보인다. 어드민 `shared/lib/date.ts`의 `weekBounds`와 같은 정의다(월요일
 * 시작 = ISO-8601 주). 두 앱은 소스를 공유하지 않으므로 한쪽을 고치면 다른 쪽도 함께 본다.
 */
export function weekBounds(today: string = todayInSeoul()): {
  start: string;
  end: string;
} {
  const base = new Date(`${today}T00:00:00Z`);
  const backToMonday = (base.getUTCDay() + 6) % 7;
  const start = new Date(base.getTime() - backToMonday * 86_400_000);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

/** `date`(YYYY-MM-DD)가 `today` 기준 이번 주(월~일) 안에 드는가. 값이 없으면 false */
export function isWithinThisWeek(
  date: string | null | undefined,
  today: string = todayInSeoul(),
): boolean {
  if (!date) return false;
  const ymd = date.slice(0, 10);
  const { start, end } = weekBounds(today);
  return ymd >= start && ymd <= end;
}
