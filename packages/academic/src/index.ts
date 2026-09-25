/*
 * @ssccops/academic — 학술 활동의 판정 기준 중 **두 앱이 같은 값이어야 하는 것**.
 *
 * ── 왜 패키지로 나왔나 (#698 · ssccops#516) ──────────────────
 * `apps/admin`과 `apps/lms`의 `entities/academic-session/model/attendance-rate.ts`가 주석을
 * 걷으면 **글자까지 같았다.** 두 파일이 각자 그 사실을 알고 감수하고 있었다 — admin 쪽은
 * «apps/lms 와 같은 값이어야 한다 … 한쪽을 고치면 다른 쪽도 함께 본다», lms 쪽은 «#130이
 * apps/admin에 같은 상수를 두면 두 앱이 이 숫자로 맞춰져 있어야 한다».
 *
 * **그 규약을 사람이 지키고 있었다는 것이 문제다.** 수료 기준이 70에서 바뀌는 날 한쪽만 고치면
 * 어드민의 «낮은 출석률» 목록과 스터디장이 보는 출석부의 강조가 **서로 다른 사람을 가리킨다.**
 * 화면에는 그럴듯한 숫자가 그대로 찍히므로 타입도 린트도 잡지 못하고, 누가 볼 때까지 그대로
 * 돈다 — `@ssccops/date`가 패키지로 나온 이유(#328 «날짜가 하루 어긋나는 것»)와 같은 종류다.
 *
 * ── 무엇을 올리고 무엇을 두는가 ──────────────────────────────
 * **두 앱이 실제로 함께 쓰는 판정만** 올린다(`@ssccops/codes`와 같은 선). 한 앱만 쓰는 것은
 * 그 앱에 둔다 — 전부 올리면 이 패키지가 학술 도메인의 사본이 되고, 그러면 무엇이 정말
 * 공유되는지 알 수 없다.
 *
 * **서버가 내리는 판정은 여기 오지 않는다.** 진행률·지연 여부처럼 서버가 계산해 주는 값을
 * 화면이 다시 판정하면 두 벌이 되어 결과가 갈린다(루트 `AGENTS.md` · 서버 `isDelayed`가 그
 * 이유로 서버 몫이다). 여기 있는 것은 **서버가 판정하지 않는 표시 기준**뿐이다.
 *
 * 앱은 `entities/academic-session` 배럴에서 이것을 재export 한다 — 화면 코드는 종전대로
 * `@/entities/academic-session`을 부른다.
 */

/**
 * 「낮은 출석률」의 경계 (%).
 *
 * **서버 값이 아니라 화면이 정한 기준이다.** 서버는 출석 수와 전체 수만 주고 «낮다»를 판정하지
 * 않는다 — 수료 기준(#130)은 운영 정책이고 그 숫자를 바꾸는 일이 배포와 같은 주기가 아니다.
 *
 * 바꿀 때 **한 곳만 고치면 된다는 것이 이 파일의 존재 이유다.** 값을 앱으로 되돌리지 말 것.
 */
export const LOW_ATTENDANCE_RATE = 70;

/**
 * 출석률(%). 전체가 0이면 `null` — **0%가 아니다.**
 *
 * 회차가 아직 없는 활동을 «출석률 0%»로 그리면 «다 빠졌다»로 읽힌다. 없는 값을 만들어 내지
 * 않는다는 규칙(루트 `AGENTS.md`)이 이 자리에서 `null`로 나타난다.
 */
export function attendanceRatePercent(
  presentCount: number,
  totalCount: number,
): number | null {
  if (totalCount <= 0) return null;
  return Math.round((presentCount / totalCount) * 100);
}

/** 출석률 표기 — 값이 없으면 `-`. 「0%」와 「모르겠다」가 화면에서 갈려야 한다 */
export function formatAttendanceRate(rate: number | null): string {
  return rate === null ? "-" : `${rate}%`;
}

/**
 * 「낮은 출석률」인가.
 *
 * 값이 없으면 **낮은 것이 아니다** — 아직 셀 수 없다는 뜻이라 경고 목록에 올리면 회차를 열지도
 * 않은 활동이 전부 빨갛게 뜬다.
 */
export function isLowAttendanceRate(rate: number | null): boolean {
  return rate !== null && rate < LOW_ATTENDANCE_RATE;
}
