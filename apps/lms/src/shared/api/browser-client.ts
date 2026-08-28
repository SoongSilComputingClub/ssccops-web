"use client";

import { createClient } from "@/shared/lib/supabase/client";
import { AUTH_ERROR } from "./auth-error";
import { ApiError, apiFetch, apiFetchList, type ApiListResult } from "./client";

/*
 * 인증이 필요한 API 호출 (브라우저 전용).
 *
 * apps/www의 같은 파일에서 옮겼다. 이 앱은 화면 대부분이 서버 컴포넌트이고 인증 호출도 서버에서
 * 하지만, **답을 고칠 때마다 초안을 저장하고 제출까지 해야 하는 화면**(기획안 제출 등)은 서버
 * 렌더만으로 그릴 수 없다 — 그런 화면이 이 통로를 쓴다. 서버 컴포넌트는 쿠키에서 토큰을
 * 꺼내지만(`next/headers`) 브라우저에는 그 통로가 없으므로, 여기서는 Supabase 브라우저
 * 클라이언트가 들고 있는 세션에서 access token을 꺼낸다.
 *
 * 봉투 벗기기·`ApiError` 변환은 `apiFetch`를 그대로 통과한다(오류 모양이 두 벌이 되지 않게).
 * 오류 코드·판정도 `auth-error.ts` 한 벌을 함께 본다. 서버용(`authed-client.ts`)과 다른 것은
 * **토큰을 어디서 꺼내는가** 하나뿐이다.
 *
 * 어드민의 `apiFetch`와 달리 **리다이렉트를 하지 않는다.** 401·403은 오류로 올려 보내고 화면이
 * 안내로 그린다 — apps/www가 세운 규약을 잇는다.
 */

/**
 * 브라우저 세션의 access token.
 *
 * `getUser()`가 아니라 `getSession()`을 쓰는 이유는 서버용 클라이언트와 같다 — 필요한 것은
 * 사용자 정보가 아니라 ssccops-server에 실어 보낼 토큰이고, 유효성 판정은 서버가 한다.
 * 만료가 임박한 토큰은 supabase-js가 이 호출에서 스스로 갱신한다.
 */
async function browserAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  return session?.access_token ?? null;
}

/** 토큰·Content-Type을 실어 주는 공통 처리 */
async function authedInit(init?: RequestInit): Promise<RequestInit> {
  const token = await browserAccessToken();
  if (!token) {
    throw new ApiError(AUTH_ERROR.UNAUTHENTICATED, "로그인이 필요합니다", 401);
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  // 헤더 없이 JSON을 보내면 서버가 415로 끊는다
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return { ...init, headers };
}

/**
 * 인증 API 호출 — 토큰이 없으면 서버에 보내지 않고 `CLIENT_UNAUTHENTICATED`로 끊는다.
 */
export async function apiFetchAuthedFromBrowser<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  return apiFetch<T>(path, await authedInit(init));
}

/** 인증 커서 목록 호출 (브라우저) — `data` 배열과 `page` 봉투를 함께 돌려준다 */
export async function apiFetchAuthedListFromBrowser<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiListResult<T>> {
  return apiFetchList<T>(path, await authedInit(init));
}
