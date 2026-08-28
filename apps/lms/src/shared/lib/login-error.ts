/**
 * 로그인 실패 사유 → 화면 문구 (`?login_error=` · app/auth/callback/route.ts).
 *
 * apps/www의 `entities/session/model/login-error.ts`와 같은 매핑이다. 이 앱에는 아직 세션
 * 슬라이스가 없어(#169 — 화면 이슈가 붙인다) `shared/lib`에 둔다. Supabase가 주는 원인 코드를
 * 화면에 그대로 내보내지 않는다 — 코드는 로그에서 갈라 보라고 쿼리에 실린 것이고, 읽는
 * 사람에게 뜻이 닿는 것은 아래 문장이다.
 */
export function loginErrorMessage(code: string): string {
  switch (code) {
    case "access_denied":
      return "구글 로그인을 취소했습니다 — 다시 시도해 주세요";
    case "missing_code":
    case "exchange_failed":
      return "로그인을 마치지 못했습니다 — 다시 시도해 주세요";
    default:
      return "로그인에 실패했습니다 — 다시 시도해 주세요";
  }
}
