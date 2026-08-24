/**
 * 문자열을 CSV 파일로 내려받게 한다.
 *
 * BOM(`﻿`)을 앞에 붙이는 것이 이 함수의 존재 이유다. 엑셀은 BOM이 없는 UTF-8 CSV를
 * 시스템 기본 인코딩(한국어 윈도우에서는 CP949)으로 읽어 한글이 통째로 깨진다 — 내려받은
 * 양식이나 오류 목록을 열었을 때 이름이 '?????'로 보이면 그 파일은 쓸모가 없다.
 *
 * 서버가 읽을 때는 문제가 되지 않는다. 이관 파서가 BOM을 떼고 읽는다(`MemberImportParser`).
 */
export function downloadCsv(filename: string, text: string): void {
  const blob = new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * 값 하나를 CSV 필드로 감싼다 — 쉼표·따옴표·줄바꿈이 들어 있으면 따옴표로 묶고 내부 따옴표를
 * 겹친다(RFC 4180).
 *
 * 검증 사유에는 쉼표가 흔하다("필수값 누락, 학번"). 감싸지 않고 이어 붙이면 내려받은 오류
 * 목록에서 그 한 줄만 칸이 밀려, 정작 고쳐야 할 행의 사유가 다른 칸에 가 있다.
 */
export function csvField(value: string | number): string {
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

/** 행 배열을 CSV 본문으로 — 줄 끝은 CRLF다(엑셀이 기대하는 형식이다) */
export function toCsvText(rows: readonly (readonly (string | number)[])[]): string {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n");
}
