"use client";

import { createClient } from "@/shared/lib/supabase/client";
import { AUTH_ERROR } from "./auth-error";
import { ApiError, apiFetch, apiFetchNullable } from "./client";

/*
 * 인증이 필요한 API 호출 (브라우저 전용).
 *
 * ── 왜 서버용(`authed-client.ts`)과 따로 있는가 ────────────────
 * 이 앱은 전 화면이 서버 컴포넌트이고, 그래서 인증 호출도 서버에서 한다(#150). **신청서 작성
 * 화면 하나만 예외다** — 답을 고칠 때마다 초안을 저장하고(디바운스) 제출까지 해야 하는 화면이라
 * 서버 렌더만으로는 그릴 수 없다. 서버 컴포넌트는 쿠키에서 토큰을 꺼내지만(`next/headers`)
 * 브라우저에는 그 통로가 없으므로, 여기서는 Supabase 브라우저 클라이언트가 들고 있는 세션에서
 * access token을 꺼낸다.
 *
 * ── 두 파일이 공유하는 것과 나눈 것 ────────────────────────────
 * 봉투 벗기기·`ApiError` 변환은 양쪽 다 `apiFetch`를 그대로 통과한다(오류 모양이 두 벌이 되지
 * 않게). 오류 코드와 판정도 `auth-error.ts` 한 벌을 함께 본다. 다른 것은 **토큰을 어디서
 * 꺼내는가** 하나뿐이다.
 *
 * 어드민의 `apiFetch`와 달리 **리다이렉트를 하지 않는다.** 401·403은 오류로 올려 보내고 화면이
 * 안내로 그린다 — 신청 흐름은 로그인·가입·작성을 한 화면 안에서 잇는 것이 §8-4의 요구다.
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

/** 인증 API 호출 — 봉투의 `data`만 돌려주고, 비어 있으면(`null`) 오류로 세운다 */
export async function apiFetchAuthedFromBrowser<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  return apiFetch<T>(path, await authedInit(init));
}

/**
 * 인증 API 호출 — **`data`가 null인 성공 응답을 그대로 null로 돌려준다**(#197).
 *
 * "작성 중인 것이 없으면 `data`가 null인 200"이 서버 계약인 초안 조회 전용이다. 이 조회에
 * `apiFetchAuthedFromBrowser`를 쓰면 초안이 없는 **정상** 상태가 매번 오류로 둔갑해, 신청서를
 * 한 번도 쓰지 않은 사람이 첫 진입에서 막힌다 — #197이 실제로 그것이었다.
 */
export async function apiFetchAuthedNullableFromBrowser<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  return apiFetchNullable<T>(path, await authedInit(init));
}

/**
 * 토큰을 헤더에 실은 요청 옵션. 토큰이 없으면 서버에 보내지 않고 `CLIENT_UNAUTHENTICATED`로 끊는다.
 *
 * 본문이 있으면 `Content-Type: application/json`을 붙인다. 익명 조회만 하던 `apiFetch`에는
 * 이 처리가 없었는데(GET뿐이었다), 헤더 없이 JSON을 보내면 서버가 415로 끊는다.
 */
async function authedInit(init?: RequestInit): Promise<RequestInit> {
  const token = await browserAccessToken();
  if (!token) {
    throw new ApiError(AUTH_ERROR.UNAUTHENTICATED, "로그인이 필요합니다", 401);
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return { ...init, headers };
}
