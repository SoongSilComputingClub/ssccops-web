/**
 * 행사 일시 표기.
 *
 * 서버는 모든 일시를 서비스 시간대(Asia/Seoul)의 `OffsetDateTime`으로 준다
 * (`"2026-09-15T18:00:00+09:00"`). 그래서 **문자열을 잘라 쓴다** — `new Date(...)`로 파싱해
 * 브라우저·워커의 로컬 시간대로 그리면, 서울 밖에서 열었을 때 같은 행사가 다른 시각으로 보인다.
 * 행사 시각은 모두가 공유하는 하나의 사실이라 보는 사람에 따라 달라지면 안 된다.
 *
 * 요일만은 계산이 필요한데, 잘라 낸 연·월·일로 `Date.UTC`를 만들어 UTC 기준 요일을 읽는다 —
 * 값에 시간대가 섞이지 않아 어디서 렌더하든 같은 답이 나온다.
 */

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

interface Parts {
  y: number;
  m: number;
  d: number;
  /** 시각이 없는 일자D 값이면 null */
  hm: string | null;
}

/** 일시TS·일자D 문자열 → 표기에 필요한 조각. 모양이 어긋나면 null(추측하지 않는다) */
function parse(value: string | null | undefined): Parts | null {
  if (!value) return null;
  const matched = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value);
  if (!matched) return null;
  const [, y, m, d, hh, mm] = matched;
  return {
    y: Number(y),
    m: Number(m),
    d: Number(d),
    hm: hh && mm ? `${hh}:${mm}` : null,
  };
}

function weekday({ y, m, d }: Parts): string {
  return WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** "2026년 9월 15일 (화)" — 연도까지 적는 것은 지난 학기 행사가 목록에 함께 서기 때문이다 */
function formatDay(parts: Parts): string {
  return `${parts.y}년 ${parts.m}월 ${parts.d}일 (${weekday(parts)})`;
}

function sameDay(a: Parts, b: Parts): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

/**
 * 행사 일시 한 줄. 일시가 없으면 null을 돌려주고 **화면이 그 자리를 비운다** —
 * "미정" 같은 문구를 여기서 채우면 "서버가 준 값"과 구별할 수 없다(표기 규칙은 그리는 쪽 몫).
 *
 * - 시작만: `2026년 9월 15일 (화) 18:00`
 * - 같은 날: `2026년 9월 15일 (화) 18:00 ~ 21:00`
 * - 다른 날: `2026년 9월 15일 (화) 18:00 ~ 2026년 9월 16일 (수) 12:00`
 * - 종료만(시작 없음): `~ 2026년 9월 16일 (수) 12:00`
 */
export function formatEventPeriod(
  eventBgngDt: string | null,
  eventEndDt: string | null,
): string | null {
  const bgng = parse(eventBgngDt);
  const end = parse(eventEndDt);

  if (!bgng && !end) return null;
  if (!bgng && end) return `~ ${formatDay(end)}${end.hm ? ` ${end.hm}` : ""}`;
  if (!bgng) return null;

  const head = `${formatDay(bgng)}${bgng.hm ? ` ${bgng.hm}` : ""}`;
  if (!end) return head;

  // 같은 날 안에서 끝나면 뒤쪽 날짜를 반복하지 않는다 — 한 줄이 두 배로 길어질 뿐이다
  if (sameDay(bgng, end)) return end.hm ? `${head} ~ ${end.hm}` : head;
  return `${head} ~ ${formatDay(end)}${end.hm ? ` ${end.hm}` : ""}`;
}

/** 목록 카드의 짧은 일시 — "9월 15일 (화) 18:00". 연도를 떼어 카드 한 줄에 장소까지 들어가게 한다 */
export function formatEventDate(eventBgngDt: string | null): string | null {
  const bgng = parse(eventBgngDt);
  if (!bgng) return null;
  return `${bgng.m}월 ${bgng.d}일 (${weekday(bgng)})${bgng.hm ? ` ${bgng.hm}` : ""}`;
}
