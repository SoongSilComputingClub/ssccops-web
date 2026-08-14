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
