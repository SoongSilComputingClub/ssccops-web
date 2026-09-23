"use client";

import { createPushApi } from "@ssccops/pwa";
import {
  apiFetchAuthedFromBrowser,
  apiFetchAuthedNullableFromBrowser,
} from "@/shared/api/browser-client";

/*
 * `/v1/push/*` — Web Push 구독 (#616 · ssccops#453 · ADR-0045 · #671).
 *
 * 세 호출(`config`·`subscribe`·`unsubscribe`)은 계약이 정하는 하나라 `@ssccops/pwa`의 `createPushApi`가
 * 만든다(`createNotificationApi`와 같은 자리) — 이 파일은 **보내는 통로**만 꽂는다. 브라우저에서만
 * 부르므로 `browser-client.ts`를 타고, `DELETE`는 `data` 없는 200 봉투라 `Nullable` 통로가 따로
 * 필요하다(`apiFetchAuthedFromBrowser`는 `data: null`을 오류로 세운다). 401·403은 훅이 `error`로
 * 올리고 스위치는 꺼진 채 남는다.
 */
export const pushApi = createPushApi(apiFetchAuthedFromBrowser, apiFetchAuthedNullableFromBrowser);
