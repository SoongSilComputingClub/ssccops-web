/*
 * 학술 일시 표기 — 공통 규칙은 `@ssccops/date`에 있다 (ssccops-web#328).
 *
 * 서버는 모든 일시를 서비스 시간대(Asia/Seoul)의 `OffsetDateTime`으로 준다
 * ("2026-03-01T00:00:00+09:00"). **문자열을 잘라 쓴다** — `new Date(...)`로 파싱해
 * 브라우저·워커의 로컬 시간대로 그리면, 서울 밖에서 열었을 때 같은 날짜가 다른 값으로 보인다.
 *
 * ── 옮겨 간 것 ──────────────────────────────────────────────
 * `formatDt`·`todayInSeoul`·`weekBounds`·`isWithinThisWeek`가 `@ssccops/date`로 갔다. 앞의
 * 셋은 어드민에 **글자까지 같은 사본**이 있었고, `weekBounds`의 옛 주석은 "두 앱은 소스를
 * 공유하지 않으므로 한쪽을 고치면 다른 쪽도 함께 본다"고 당부하고 있었다 — 그 당부가 필요
 * 없어진 자리다. 아래 재export로 남기는 것은 호출부를 건드리지 않기 위해서다
 * (`shared/lib/cn.ts`와 같은 방식 · ssccops#243).
 *
 * `formatDt`는 이 앱의 구현(모양을 확인한 뒤 자른다)이 그대로 올라갔다 — 어드민·www의
 * 느슨한 쪽은 일시가 아닌 값에서 `"2026-03-01"`처럼 날짜로 읽히는 조각을 그대로 내보낸다.
 *
 * ── 여기 남은 것과 그 이유 ──────────────────────────────────
 * `formatYmdDotted`는 **이름을 바꿔 남겼다.** 어드민에 `formatYmd`라는 같은 이름의 함수가
 * 있었는데 결과가 `"2026-03-01"`로 달랐다 — 같은 이름·다른 결과라 한쪽 화면의 줄을 옮기면
 * 표기가 소리 없이 바뀐다.
 *
 * 공유로 올라간 `formatYmd`는 `YYYY-MM-DD` 쪽이다(`AGENTS.md` §데이터 표기가 일자D의 표기로
 * 못 박은 모양). 이 앱의 점 표기는 **화면 표기 취향**이라 근거의 종류가 다르고, 회차 목록·
 * 출석부·대시보드 15곳의 표기를 화면으로 확인하지 않은 채 뒤집을 것이 아니라서 그대로 뒀다.
 * 이름을 갈랐으니 둘을 헷갈려 부를 일은 이제 없다 — 표기를 통일할지는 화면을 보고 정한다.
 */

export { formatDt, isWithinThisWeek, todayInSeoul, weekBounds } from "@ssccops/date";

/**
 * 일시TS·일자D → "2026. 3. 1." · 값이 없거나 모양이 어긋나면 빈 문자열(추측하지 않는다).
 *
 * 이 앱의 화면 표기다 — 데이터 표기(`YYYY-MM-DD`)는 `@ssccops/date`의 `formatYmd`가 준다.
 * 이름이 겹쳐 있던 것을 #328에서 갈랐다(윗글 참고).
 */
export function formatYmdDotted(value: string | null | undefined): string {
  if (!value) return "";
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!matched) return "";
  const [, y, m, d] = matched;
  return `${Number(y)}. ${Number(m)}. ${Number(d)}.`;
}
