/*
 * 출석률 기준선 (#172 · #130).
 *
 * 서버는 출석률을 내려주지 않는다 — 출석부 화면(#172)이 회차×팀원 행렬에서 직접 센다. "낮은
 * 출석률"의 경계도 서버 값이 아니라 화면이 정하는 상수다. 어드민의 출석 통계 화면(#130)이
 * "70% 미만 회원"을 같은 기준으로 세므로 값을 여기 한 곳에 두고 근거를 남긴다 — #130이
 * apps/admin에 같은 상수를 두면 두 앱이 이 숫자로 맞춰져 있어야 한다(FSD 레이어는 앱마다
 * 따로라 소스를 공유하지 않는다).
 *
 * ── 왜 70인가 ──────────────────────────────────────────────
 * 학술 활동 수료 기준(전체 회차의 2/3 이상 출석 ≈ 67%)을 한 자리 올림한 값이다. 이보다
 * 낮으면 스터디장이 먼저 살펴봐야 하는 팀원으로 표에서 눈에 띄게 한다(경고일 뿐 제재는
 * 아니다 — wave2 D5의 "참고치" 원칙과 같다).
 */

/** 이 값 미만(%)이면 "낮은 출석률"로 표시한다 */
export const LOW_ATTENDANCE_RATE = 70;

/** present / total 을 정수 퍼센트로. total 이 0이면 null(셀 것이 없다 — "0%"로 뭉개지 않는다) */
export function attendanceRatePercent(
  presentCount: number,
  totalCount: number,
): number | null {
  if (totalCount <= 0) return null;
  return Math.round((presentCount / totalCount) * 100);
}

/** 표시용 — 값이 없으면 "-", 있으면 "86%" */
export function formatAttendanceRate(rate: number | null): string {
  return rate === null ? "-" : `${rate}%`;
}

/** 살펴봐야 하는 낮은 출석률인가 — 값이 없으면(아직 셀 회차가 없음) false */
export function isLowAttendanceRate(rate: number | null): boolean {
  return rate !== null && rate < LOW_ATTENDANCE_RATE;
}
