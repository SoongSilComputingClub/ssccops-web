/** 원본 프로토타입의 채번 규칙: MEM-0008, FORM-0014, m8, f5, w5, t9, mt4 */
export function nextMemberId(count: number): string {
  return `MEM-${String(1000 + count + 1).slice(1)}`;
}

export function nextFormId(count: number): string {
  return `FORM-${String(1000 + count + 3).slice(1)}`;
}

export function nextKey(prefix: string, count: number): string {
  return `${prefix}${count + 1}`;
}
