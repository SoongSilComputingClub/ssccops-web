import { createClient } from "@/shared/lib/supabase/server";
import { AUTH_ERROR } from "./auth-error";
import {
  ApiError,
  apiFetch,
  apiFetchList,
  apiFetchNullable,
  type ApiListResult,
} from "./client";

/*
 * 인증이 필요한 API 호출 (서버 컴포넌트 전용).
 *
 * apps/www의 같은 파일에서 그대로 옮겼다 — 이 앱은 전 화면이 로그인 필수이므로 사실상 모든
 * 조회가 이 통로를 탄다. 하는 일은 access token을 헤더에 싣는 것 하나이고, 봉투 벗기기·
 * `ApiError` 변환은 `apiFetch`를 그대로 통과한다(오류 모양이 두 벌이 되지 않게).
 *
 * 어드민의 `apiFetch`와 달리 **리다이렉트를 하지 않는다.** 이 앱에는 밀어낼 로그인 화면이 없고
 * (로그인은 지금 보고 있는 화면 위에서 시작한다) 서버 컴포넌트에서 `window.location`을 만질
 * 수도 없다. 401·403은 오류로 올려 보내고 화면(과 공용 로그인 게이트)이 안내로 그린다 —
 * apps/www가 세운 규약을 잇는다.
 *
 * 브라우저에서 같은 호출을 해야 하는 화면(기획안 자동 저장·제출 등)은 옆의 `browser-client.ts`를
 * 쓴다 — 토큰을 꺼내는 통로만 다르고 나머지는 같다. 오류 코드·판정은 `auth-error.ts` 한 벌이다.
 * 이 파일이 `next/headers`를 타므로 **클라이언트 컴포넌트에서 임포트하면 빌드가 깨진다** —
 * 그래서 코드값만 `auth-error.ts`로 따로 뽑아 둔 것이다.
 */

export { AUTH_ERROR, isSignupRequired, isUnauthenticated } from "./auth-error";

/**
 * 쿠키에 들어 있는 Supabase access token.
 *
 * `getUser()`가 아니라 `getSession()`을 쓴다 — 우리가 필요한 것은 사용자 정보가 아니라
 * **ssccops-server에 실어 보낼 토큰**이고, 그 토큰이 유효한지 판정하는 것은 서버다.
 * 여기서 `getUser()`를 부르면 화면을 그릴 때마다 Supabase 왕복이 하나 더 붙는데, 갱신은 이미
 * 미들웨어가 끝내 두었다(shared/lib/supabase/proxy.ts — 이 앱은 전 경로에서 돈다).
 */
export async function currentAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/** 토큰을 헤더에 실어 주는 공통 처리 — 없으면 서버에 보내지 않고 `CLIENT_UNAUTHENTICATED`로 끊는다 */
async function authedInit(init?: RequestInit): Promise<RequestInit> {
  const token = await currentAccessToken();
  if (!token) {
    throw new ApiError(AUTH_ERROR.UNAUTHENTICATED, "로그인이 필요합니다", 401);
  }
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

/** 인증 단건 호출 — 봉투를 벗겨 `data`만 돌려준다 */
export async function apiFetchAuthed<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, await authedInit(init));
}

/**
 * 인증 단건 호출 — **`data`가 null인 성공 응답을 그대로 null로 돌려준다**.
 *
 * 서버가 "없음"을 `data: null` 200으로 주는 조회 전용이다. 그런 조회에 {@link apiFetchAuthed}를
 * 쓰면 없음이라는 **정상** 상태가 매번 `CLIENT_UNKNOWN_ERROR`로 둔갑한다(ssccops-web#197).
 * 페이징 없는 목록 조회들이 `?? []`로 빈 목록을 다루려는 것도 이 통로라야 실제로 닿는다.
 */
export async function apiFetchAuthedNullable<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  return apiFetchNullable<T>(path, await authedInit(init));
}

/**
 * 인증 커서 목록 호출 — `data` 배열과 `page` 봉투를 함께 돌려준다.
 *
 * 학술 목록(스터디/프로젝트·회차 이력 등)이 커서 페이징이라 필요하다(#169). 어드민에는
 * `apiFetchList`가 세션 주입까지 겸하지만, 이 앱은 www 구조를 따라 전송 계층을 나눠 두었으므로
 * 여기서 토큰을 실어 `client.ts`의 `apiFetchList`에 넘긴다.
 */
export async function apiFetchAuthedList<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiListResult<T>> {
  return apiFetchList<T>(path, await authedInit(init));
}
