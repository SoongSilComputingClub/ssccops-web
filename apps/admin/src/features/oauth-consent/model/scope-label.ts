/*
 * scope → 사용자 문구 (ssccops#315).
 *
 * 화면은 **요청된 scope를 원문 그대로** 보인다 — DCR 클라이언트가 무엇을 요구했는지 감추지
 * 않는 것이 ADR-0026의 방어선이다. 아는 값에만 설명을 덧붙이고, 모르는 값은 원문만 남긴다.
 * 표에 없는 scope를 "알 수 없는 권한"으로 뭉개면 사용자가 판단할 정보를 화면이 지운다.
 */
const SCOPE_DESCRIPTION: Record<string, string> = {
  openid: "로그인한 계정을 식별합니다",
  email: "계정의 이메일 주소를 봅니다",
  profile: "계정의 이름·프로필 사진을 봅니다",
  offline_access: "로그인하지 않아도 연결을 유지합니다",
};

export function scopeDescription(scope: string): string | null {
  return SCOPE_DESCRIPTION[scope] ?? null;
}
