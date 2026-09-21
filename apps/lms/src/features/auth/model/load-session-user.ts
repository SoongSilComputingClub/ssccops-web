import { createClient } from "@ssccops/auth/supabase/server";

/*
 * 로그인 계정 — 쿠키의 Supabase 세션에서 읽는다 (#606 · «내 정보» `/my`).
 *
 * 서버 컴포넌트 전용이다(`next/headers`) — 배럴(`features/auth/index.ts`)이 재export 하지 않는다(다른
 * `load-*`와 같은 규칙). ssccops-server를 부르지 않는다 — 화면이 보이는 것은 구글 계정(이메일·이름)뿐이고
 * 그것은 세션에 이미 있다. 회원 정보(등급·기수)는 이 앱의 소관이 아니라 여기 없다.
 *
 * `getUser()`가 아니라 `getSession()`인 것은 `authed-client.ts`와 같은 이유다 — 표시용이고, 유효성은
 * 갱신이 미들웨어에서 이미 끝났다.
 */
export interface SessionUser {
  email: string | null;
  name: string | null;
}

export async function loadSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  const meta = session.user.user_metadata as { full_name?: string; name?: string } | undefined;
  return {
    email: session.user.email ?? null,
    name: meta?.full_name ?? meta?.name ?? null,
  };
}
