/**
 * 오리진 설정값의 끝 슬래시를 턴다 — `https://a.b/` → `https://a.b` (#659 · S8786).
 *
 * `replace(/\/+$/, "")`와 결과가 같고 **되돌아가지 않는다**. 정규식 쪽은 끝에 닿지 못한 슬래시
 * 묶음마다 시작 위치를 다시 잡아 입력 길이의 제곱으로 번지는데(`"/".repeat(n)` + `"x"`가 그
 * 모양이다), 여기서는 뒤에서 한 번만 훑는다. 값이 없으면 빈 문자열이라 부르는 쪽은 `|| null`·
 * `if (!base)`로 «설정이 없다»를 그대로 가른다.
 */
export function withoutTrailingSlash(value: string | undefined): string {
  if (!value) return "";
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end -= 1;
  return end === value.length ? value : value.slice(0, end);
}
