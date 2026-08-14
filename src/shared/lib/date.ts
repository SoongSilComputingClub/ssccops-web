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
