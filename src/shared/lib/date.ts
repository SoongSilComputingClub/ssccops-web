/** "2026-08-01 09:00" → datetime-local 입력값 "2026-08-01T09:00" (날짜만이면 T00:00 보정) */
export function toInput(value: string, withTime?: boolean): string {
  if (!value) return "";
  const t = String(value).trim().replace(" ", "T");
  return withTime ? (t.length === 10 ? `${t}T00:00` : t.slice(0, 16)) : t.slice(0, 10);
}

/** datetime-local 입력값 → 표시 문자열 ("T" → 공백) */
export function fromInput(value: string): string {
  return value ? String(value).replace("T", " ") : "";
}
