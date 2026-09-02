/*
 * 출석률 기준선 (#130).
 *
 * 서버는 출석률을 내려주지 않는다 — 출석 통계 화면(#130)이 회차 이력·출석부 응답에서
 * 직접 센다. "낮은 출석률"의 경계도 서버 값이 아니라 화면이 정하는 상수다. 값을 여기
 * 한 곳에 두고 근거를 남긴다 — 집계 자체는 features/academic-session/model/
 * use-attendance-stats 훅 하나에만 두고, 이 파일은 숫자와 순수 계산 함수만 갖는다.
 *
 * ── 왜 70인가 ──────────────────────────────────────────────
 * 학술 활동 수료 기준(전체 회차의 2/3 이상 출석 ≈ 67%)을 한 자리 올림한 값이다. 이보다
 * 낮은 회원은 학술국장이 먼저 살펴봐야 하는 대상으로 표에서 눈에 띄게 한다(경고일 뿐
 * 제재는 아니다 — wave2 D5의 "참고치" 원칙과 같다).
 *
 * ── apps/lms 와 같은 값이어야 한다 ────────────────────────────
 * 공개 앱의 출석부 화면(#172)도 같은 기준으로 "낮은 출석률"을 표시한다
 * (apps/lms/src/entities/academic-session/model/attendance-rate.ts). FSD 레이어는
 * 앱마다 따로라 소스를 공유하지 않으므로, 한쪽을 고치면 다른 쪽도 함께 본다.
 */

/** 이 값 미만(%)이면 "낮은 출석률"로 표시한다 */
export const LOW_ATTENDANCE_RATE = 70;

/**
 * present / total 을 정수 퍼센트로. total 이 0이면 null 이다 — 셀 회차가 없다는 뜻이라
 * "0%"로 뭉개지 않는다(없는 값을 지어내지 않는다).
 */
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
