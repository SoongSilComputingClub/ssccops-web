import { createClient } from "@/shared/lib/supabase/server";
import { AUTH_ERROR } from "./auth-error";
import { ApiError, apiFetch } from "./client";

/*
 * 인증이 필요한 API 호출 (서버 컴포넌트 전용).
 *
 * 옆의 `client.ts`는 익명 전용으로 남는다 — 행사 목록·상세는 로그인 없이 열리는 것이 이 앱의
 * 전제이고(D1), 거기에 토큰 로직을 섞으면 비로그인 방문자의 조회 경로에까지 Supabase가 끼어든다.
 * 그래서 **더하기만** 했다: 여기서 하는 일은 access token을 헤더에 싣는 것 하나이고, 봉투 벗기기·
 * `ApiError` 변환은 `apiFetch`를 그대로 통과한다(오류 모양이 두 벌이 되지 않게).
 *
 * 어드민의 `apiFetch`와 달리 **리다이렉트를 하지 않는다.** 이 앱에는 밀어낼 로그인 화면이 없고
 * (로그인은 지금 보고 있는 화면 위에서 시작한다) 서버 컴포넌트에서 `window.location`을 만질
 * 수도 없다. 401·403은 오류로 올려 보내고 화면이 안내로 그린다 — 갈 곳 없는 리다이렉트를
 * 만들지 않기 위한 규칙이다.
 *
 * 브라우저에서 같은 호출을 해야 하는 화면(신청서 작성)은 옆의 `browser-client.ts`를 쓴다 —
 * 토큰을 꺼내는 통로만 다르고 나머지는 같다. 오류 코드·판정은 `auth-error.ts` 한 벌이다.
 */

export { AUTH_ERROR, isSignupRequired, isUnauthenticated } from "./auth-error";

/**
 * 쿠키에 들어 있는 Supabase access token.
 *
 * `getUser()`가 아니라 `getSession()`을 쓴다 — 우리가 필요한 것은 사용자 정보가 아니라
 * **ssccops-server에 실어 보낼 토큰**이고, 그 토큰이 유효한지 판정하는 것은 서버다.
 * 여기서 `getUser()`를 부르면 화면을 그릴 때마다 Supabase 왕복이 하나 더 붙는데, 갱신은 이미
 * 미들웨어가 이 경로에서 끝내 두었다(shared/lib/supabase/proxy.ts).
 */
export async function currentAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/** 인증 API 호출 — 토큰이 없으면 서버에 보내지 않고 `CLIENT_UNAUTHENTICATED`로 끊는다 */
export async function apiFetchAuthed<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await currentAccessToken();
  if (!token) {
    throw new ApiError(AUTH_ERROR.UNAUTHENTICATED, "로그인이 필요합니다", 401);
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return apiFetch<T>(path, { ...init, headers });
}
