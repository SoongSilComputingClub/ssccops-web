/*
 * 학기 — 활동일(`actv_ymd`)을 학기로 묶는 규칙 (#520 · ssccops#382).
 *
 * **1학기 = 3월~8월, 2학기 = 9월~이듬해 2월.** 학사 일정의 학기(3~6월 · 9~12월)가 아니라
 * 방학까지 앞 학기에 붙인 것이다 — 방학 중 프로젝트·MT가 «어느 학기 활동인가»를 물으면
 * 사람들은 직전 학기라고 답한다. 서버에는 학기 개념이 없고 활동일만 있으므로 이 규칙은
 * 웹의 것이다(`apps/www/AGENTS.md`).
 *
 * 날짜는 `YYYY-MM-DD` 문자열 그대로 비교한다 — `new Date`로 파싱하면 렌더하는 곳의 시간대가
 * 섞인다(`shared/lib/date.ts`와 같은 판단).
 */
export type Semester = 1 | 2;

export interface SemesterRange {
  year: number;
  semester: Semester;
  /** 포함 — `YYYY-03-01` 또는 `YYYY-09-01` */
  start: string;
  /** 미포함 — `YYYY-09-01` 또는 `YYYY+1-03-01` */
  endExclusive: string;
}

export function semesterRange(year: number, semester: Semester): SemesterRange {
  return semester === 1
    ? { year, semester, start: `${year}-03-01`, endExclusive: `${year}-09-01` }
    : { year, semester, start: `${year}-09-01`, endExclusive: `${year + 1}-03-01` };
}

/** 날짜(`YYYY-MM-DD…` — 일시 문자열도 앞 10자만 본다)가 그 학기 안인가 */
export function isInSemester(ymd: string | null | undefined, range: SemesterRange): boolean {
  if (!ymd) return false;
  const day = ymd.slice(0, 10);
  return day >= range.start && day < range.endExclusive;
}

/** 날짜 → 그 날이 속한 학기. 모양이 어긋나면 null */
export function semesterOf(ymd: string | null | undefined): SemesterRange | null {
  if (!ymd) return null;
  const matched = /^(\d{4})-(\d{2})/.exec(ymd);
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  if (month >= 3 && month <= 8) return semesterRange(year, 1);
  // 1·2월은 전년도 2학기다
  return month >= 9 ? semesterRange(year, 2) : semesterRange(year - 1, 2);
}

/** 주소 조각(`/activities/2026/1`) → 학기. 네 자리 연도와 1·2가 아니면 null */
export function parseSemesterPath(year: string, semester: string): SemesterRange | null {
  if (!/^\d{4}$/.test(year)) return null;
  if (semester !== "1" && semester !== "2") return null;
  return semesterRange(Number(year), semester === "1" ? 1 : 2);
}

/** «2026년 1학기» */
export function formatSemester(range: SemesterRange): string {
  return `${range.year}년 ${range.semester}학기`;
}
