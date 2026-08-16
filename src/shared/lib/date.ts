import { TODAY } from "@/shared/config/constants";

/**
 * 날짜/시간 표준
 * - 일자D  (DATE)      → "YYYY-MM-DD"
 * - 일시TS (TIMESTAMP) → ISO-8601 "YYYY-MM-DDTHH:mm:ss"
 *
 * 화면 표기("8월 20일", "D-3", "마감임박")는 저장하지 않고 여기서 파생한다.
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

/** 일시TS → "2026-08-12 19:00" */
export function formatDt(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 16).replace("T", " ");
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

/** 일시TS·일자D → "2026-08-12" */
export function formatYmd(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

/** 일시TS·일자D → "8월 20일" */
export function formatMd(value: string | null): string {
  if (!value) return "";
  const [, m, d] = value.slice(0, 10).split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

/**
 * 오늘 날짜(Asia/Seoul) — "YYYY-MM-DD".
 *
 * **서버에서 받아 온 값의 D-day는 이 함수로 센다.** 기본 기준일 `TODAY`는 목 데이터의 D-day
 * 시맨틱을 고정하려고 박아 둔 상수(2026-08-09)라, 실제 데이터에 쓰면 이미 지난 마감이
 * "D-11"로 보이는 식으로 조용히 틀린다.
 *
 * 브라우저의 로컬 시간대가 아니라 서비스 시간대로 센다 — 서버가 일시를 Asia/Seoul 오프셋으로
 * 내려주고 화면도 그 문자열을 그대로 잘라 쓰므로(`formatDt`), 여기서만 현지 시간대를 쓰면
 * 해외에서 접속한 운영자에게 하루가 어긋난다 (`withServiceOffset`과 같은 판단).
 */
export function todayInSeoul(): string {
  // sv-SE 로케일이 ISO와 같은 YYYY-MM-DD 표기를 준다
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
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

/** 마감 임박/지연 배지 문구 — 지연_여부(dlyYn)가 우선한다 */
export function deadlineFlag(
  ddlnDt: string | null,
  dlyYn: boolean,
  today: string = TODAY,
): "" | "마감임박" | "지연" {
  if (dlyYn) return "지연";
  const d = daysUntil(ddlnDt, today);
  if (d === null) return "";
  if (d < 0) return "지연";
  return d <= 3 ? "마감임박" : "";
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
