import { formatDt, todayInSeoul } from "@ssccops/date";

import { TODAY } from "@/shared/config/constants";

/*
 * 날짜/시간 표기 — 공통 규칙은 `@ssccops/date`에 있다 (ssccops-web#328).
 *
 * - 일자D  (DATE)      → "YYYY-MM-DD"
 * - 일시TS (TIMESTAMP) → ISO-8601 "YYYY-MM-DDTHH:mm:ss"
 *
 * 화면 표기("8월 20일" · "D-3" · "마감임박")는 저장하지 않고 여기서 파생한다.
 *
 * ── 옮겨 간 것 ──────────────────────────────────────────────
 * `formatDt`·`formatYmd`·`todayInSeoul`·`weekBounds`·`isWithinThisWeek`는 `@ssccops/date`에
 * 있다. 아래 재export로 남기는 것은 `@/shared/lib/date`를 부르는 자리가 50곳이 넘어서다 —
 * 호출부를 건드리지 않고 사본만 없앤다(`shared/lib/cn.ts`와 같은 방식 · ssccops#243).
 *
 * `formatDt`는 이제 **모양이 어긋난 값에 빈 문자열을 준다**(합치면서 lms 쪽 구현을 택했다 —
 * 근거는 패키지 주석). 이 앱의 호출 자리는 모두 일시TS 필드라 달라지는 화면은 없다.
 *
 * ── 여기 남은 것과 그 이유 ──────────────────────────────────
 * 아래 함수들은 **이 앱에만 있다.** 사본이 없으니 합칠 것이 없고, 옮기면 근거가 이 앱에 있는
 * 판단이 공유 패키지로 새어 나간다.
 *
 * - `toInput`·`fromInput`·`withServiceOffset`·`SERVICE_UTC_OFFSET` — 폼 편집 화면이 있는 앱은
 *   어드민뿐이다. `datetime-local` 입력과 서버 `OffsetDateTime` 사이를 잇는 규칙이라 읽기 전용
 *   앱에는 쓸 자리가 없다.
 * - `formatInstant` — 서버가 `Instant`로 내리는 자리(변경 이력의 `createdAt`)를 그리는 앱이
 *   어드민뿐이다.
 * - `formatMd` — "8월 20일"은 어드민 대시보드·목록의 좁은 칸을 위한 표기다.
 * - `daysUntil`·`ddayText`·`deadlineFlag`·`dueWithinDays` — 마감 배지 규칙. 기본 기준일이
 *   목 데이터용 상수 `TODAY`라 **공유 패키지가 알아서는 안 되는 값에 묶여 있다**(공유로 올리려면
 *   기본값부터 `todayInSeoul()`로 바꿔야 하는데, 그것은 표기 통합이 아니라 동작 변경이다).
 */

/** 일시TS·일자D → datetime-local / date 입력값 */
export function toInput(value: string | null, withTime?: boolean): string {
  if (!value) return "";
  const v = String(value).trim();
  if (!withTime) return v.slice(0, 10);
  return v.length <= 10 ? `${v}T00:00` : v.slice(0, 16);
}

/** datetime-local / date 입력값 → 일시TS(ISO-8601) · 일자D */
export function fromInput(value: string, withTime?: boolean): string {
  if (!value) return "";
  if (!withTime) return value.slice(0, 10);
  return value.length === 16 ? `${value}:00` : value;
}

export { formatDt, formatYmd, isWithinThisWeek, todayInSeoul, weekBounds } from "@ssccops/date";

/**
 * 서비스 표준 시간대(Asia/Seoul)의 UTC 오프셋.
 *
 * ssccops-server는 모든 일시를 이 시간대의 `OffsetDateTime`으로 주고받는다
 * (각 응답 DTO의 `SERVICE_ZONE = ZoneId.of("Asia/Seoul")` · 응답 예 `"2026-03-01T00:00:00+09:00"`).
 */
export const SERVICE_UTC_OFFSET = "+09:00";

/** 이미 오프셋(`+09:00`·`-05:00`)이나 `Z`가 붙어 있는가 */
const HAS_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * 오프셋 없는 일시 문자열에 서비스 오프셋을 붙인다.
 *
 * **서버로 나가는 일시는 오프셋이 반드시 있어야 한다.** `datetime-local` 입력이 주는 값은
 * `"2026-03-01T00:00"`처럼 오프셋이 없는데, 서버의 `FormSaveRequest.rcptBgngDt`는
 * `OffsetDateTime`이라 Jackson이 `ISO_OFFSET_DATE_TIME`으로 파싱한다 — 오프셋이 없으면
 * 값이 아무리 멀쩡해도 본문 자체가 읽히지 않아 400으로 튕긴다. 접수 일시를 한 번이라도
 * 건드리면 편집기의 자동 저장이 그 뒤로 통째로 실패하는, 조용히 번지는 종류의 어긋남이다.
 *
 * 브라우저의 로컬 오프셋(`new Date().getTimezoneOffset()`)이 아니라 **서비스 오프셋을 붙인다.**
 * 운영자가 입력창에 적는 시각은 언제나 한국 시간이고, 서버도 조회 응답을 Asia/Seoul로 내려주며
 * 화면은 그 문자열을 그대로 잘라 쓴다(`toInput`·`formatDt`). 여기서만 브라우저 시간대를 쓰면
 * 해외에서 접속한 운영자가 적은 "18:00"이 저장 후 다른 시각으로 되돌아온다.
 *
 * 서버에서 받아 온 값처럼 이미 오프셋이 붙어 있으면 그대로 둔다 — 초안이 한쪽은 오프셋 있고
 * 한쪽은 없는 채로 섞이면 접수 시작·종료 비교(form-validation)의 문자열 대소 비교가 어긋난다.
 */
export function withServiceOffset(value: string | null): string | null {
  if (!value) return null;
  if (HAS_OFFSET.test(value)) return value;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return `${withSeconds}${SERVICE_UTC_OFFSET}`;
}

/**
 * UTC 순간(`Instant`) → 서비스 시간대의 "2026-08-12 19:00".
 *
 * **`formatDt`와 갈리는 자리는 값의 출처다.** 서버의 응답 대부분은 `OffsetDateTime`이라
 * Asia/Seoul 오프셋이 붙은 문자열로 오고, 그때는 앞 16자를 그대로 잘라 쓰면 맞다. 그런데
 * 변경 이력의 `createdAt`처럼 `Instant`로 내려오는 자리는 `"2026-08-12T10:00:00Z"`(UTC)라
 * 같은 방식으로 자르면 **아홉 시간 어긋난 시각**이 화면에 뜬다 — 오전 10시에 남긴 이력이
 * 새벽 1시로 보이는 식이라, 틀렸다는 것을 알아채기 전까지는 그냥 읽힌다.
 *
 * 브라우저의 로컬 시간대가 아니라 서비스 시간대로 옮기는 것은 `todayInSeoul`·
 * `withServiceOffset`과 같은 판단이다 — 이력에 적힌 시각은 운영자들이 공유하는 하나의 사실이고,
 * 해외에서 접속한 사람에게만 다른 시각으로 보이면 같은 이력을 두고 말이 갈린다.
 *
 * 오프셋이 없는 문자열(파싱 실패 포함)은 손대지 않고 `formatDt`와 같게 잘라 쓴다 — 시간대를
 * 모르는 값에 아홉 시간을 더하면 없던 어긋남을 만든다.
 */
export function formatInstant(value: string | null): string {
  if (!value) return "";
  if (!HAS_OFFSET.test(value)) return formatDt(value);

  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return formatDt(value);

  // sv-SE 로케일이 "2026-08-12 19:00" 표기를 준다 (todayInSeoul 과 같은 이유)
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

/** 일시TS·일자D → "8월 20일" */
export function formatMd(value: string | null): string {
  if (!value) return "";
  const [, m, d] = value.slice(0, 10).split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

/** 기준일(TODAY)로부터 남은 일수. 값이 없으면 null */
export function daysUntil(value: string | null, today: string = TODAY): number | null {
  if (!value) return null;
  const target = Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
  const base = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(target) || Number.isNaN(base)) return null;
  return Math.round((target - base) / 86_400_000);
}

/** 마감_일시 → "D-3" · "D-DAY" · "D+2" */
export function ddayText(ddlnDt: string | null, today: string = TODAY): string {
  const d = daysUntil(ddlnDt, today);
  if (d === null) return "";
  if (d === 0) return "D-DAY";
  return d > 0 ? `D-${d}` : `D+${-d}`;
}

/**
 * 마감 임박/지연 배지 문구.
 *
 * **지연은 서버 판정(`isDelayed`) 하나만 본다 — 마감일을 보고 여기서 다시 세지 않는다.**
 * 예전에는 `d < 0`이면 지연으로 뒤집었는데, 그것이 목 데이터 시절(서버 판정이 없던 때)의
 * 폴백으로 남아 **완료한 하위 업무가 마감일이 지나면 '지연'으로 뜨는 버그**를 냈다(#199).
 * 서버 `SubWorkEntity.isDelayedBefore`는 `dueAt != null && workStatus != DONE &&
 * dueAt < overdueBefore`로 판정해 완료 건에는 `isDelayed=false`를 내려주는데, 화면이 그 값을
 * 받고도 마감일만 보고 뒤집었던 것이다 — `AGENTS.md`가 금지하는 "판정 규칙 두 벌"이다.
 *
 * **마감임박(`d <= 3`)만 화면 몫이다.** 서버가 임박의 기준을 정하지 않고 `dueBefore`만 받기
 * 때문이다(설계 결정 6 · `dueWithinDays` 주석 참고).
 *
 * **완료 건은 어느 배지도 달지 않는다** — 끝난 일에 "3일 남음"도 의미가 없다.
 *
 * 케이스:
 * - 완료 + 마감 지남 → `""` (배지 없음)
 * - 완료 + 마감 3일 이내 → `""` (배지 없음)
 * - 미완료 + 서버가 지연 판정 → `"지연"`
 * - 미완료 + 마감 3일 이내(당일 포함) → `"마감임박"`
 * - 마감일이 없거나 4일 이상 남음 → `""`
 */
export function deadlineFlag(
  dueAt: string | null,
  isDelayed: boolean,
  isDone: boolean,
  today: string = TODAY,
): "" | "마감임박" | "지연" {
  if (isDone) return "";
  if (isDelayed) return "지연";
  const d = daysUntil(dueAt, today);
  if (d === null) return "";
  return d >= 0 && d <= 3 ? "마감임박" : "";
}

/**
 * 마감임박 조회의 `dueBefore` 임계값 — 서비스 시간대 기준 오늘로부터 N일 후 자정 직전.
 *
 * ssccops-server는 "마감임박"의 기준을 정하지 않고 `dueBefore`만 받는다(설계 결정 6,
 * ssccops-server #28) — 임박의 기준(3일 등)은 화면 정책이라는 판단이다. 여기서 정하는 N일은
 * 목 데이터 시절 `deadlineFlag`가 쓰던 기준(d <= 3)과 같은 값을 그대로 쓴다.
 *
 * 하루 끝(23:59:59)으로 두는 것은 `deadlineFlag`가 날짜 단위(시각 무시)로 비교했던 것과
 * 같은 폭을 유지하기 위해서다 — 자정으로 두면 그날 마감인 건이 임계값보다 늦어져 빠진다.
 */
export function dueWithinDays(days: number, today: string = todayInSeoul()): string {
  const base = Date.parse(`${today}T00:00:00Z`);
  const target = new Date(base + days * 86_400_000).toISOString().slice(0, 10);
  return `${target}T23:59:59${SERVICE_UTC_OFFSET}`;
}
