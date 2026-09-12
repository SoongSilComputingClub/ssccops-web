import { Suspense } from "react";
import { OAuthConsentPage } from "@/views/oauth-consent";

/*
 * OAuth 동의 (ssccops#315 · ADR-0026) — Supabase OAuth 2.1 서버의 Authorization Path.
 *
 * `(auth)` 그룹에 두는 것은 로그인·가입과 같은 단독 레이아웃(사이드바 없음)을 쓰기 위해서다.
 * 미들웨어 가드는 그대로 받는다 — 미인증이면 `/login?next=/oauth/consent?authorization_id=…`로
 * 갔다가 로그인 뒤 같은 주소로 돌아온다(기존 `next=` 규약, `@ssccops/auth`).
 *
 * `useSearchParams`를 쓰는 화면이라 Suspense로 감싼다(로그인 화면과 같다).
 */
export default function Page() {
  return (
    <Suspense>
      <OAuthConsentPage />
    </Suspense>
  );
}
