"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { NotificationItem } from "./notification";
import type { NotificationApi } from "./notification-api";
import type { PushApp } from "./service-worker";
import {
  useNotificationList,
  type NotificationGateStatus,
  type NotificationListState,
  type NotificationTarget,
} from "./use-notification-list";

/*
 * `/notifications` 화면 상태 — **401·403을 화면 상태로 올리는 앱**(www #616 · lms #606)의 배선 (#671).
 *
 * 몸통은 옆의 `useNotificationList`다(#665). 그 위에 두 앱이 글자까지 같은 배선을 51줄씩 갖고 있었다 —
 * 라우터 이동(`router.push`)과 `classifyStatus`(401 → `unauthenticated` · 403 `SIGNUP_REQUIRED` →
 * `signup-required`). 두 앱의 `apiFetch`는 밀어낼 로그인 화면이 없어 리다이렉트하지 않고 오류로
 * 올리고, 화면은 같은 자리에서 로그인 안내·가입 안내를 그린다.
 *
 * admin은 이 훅을 쓰지 않는다 — `apiFetch`가 401(재로그인)·403(가입 화면)을 리다이렉트로 끝내 그
 * 상태가 화면에 오지 않으므로 상태가 `loading`·`ready`·`error` 셋뿐이다(`useNotificationList`를 그대로).
 *
 * 판정 자체는 앱의 `ApiError`를 아는 앱 것이라 받는다(`isUnauthenticated`·`isSignupRequired` —
 * `shared/api/auth-error.ts`). **넘기는 함수는 렌더마다 같은 것이어야 한다** — 두 앱 모두 모듈 함수다.
 */
export interface UseGatedNotificationListOptions {
  /** `createNotificationApi(앱의 apiFetch)` */
  api: NotificationApi;
  /** 이 앱 — 목록·배지의 기본 필터 (#643) */
  app: PushApp;
  /** 알림 행 → 갈 곳. 서비스워커의 `notificationclick`과 같은 규칙이어야 한다 */
  resolveTarget: (item: NotificationItem) => NotificationTarget;
  /** `ApiError` → 화면 한 줄 */
  toErrorMessage: (error: unknown) => string;
  /** 다시 로그인해야 하는 실패인가 — 앱의 `auth-error.ts` */
  isUnauthenticated: (error: unknown) => boolean;
  /** 인증은 됐지만 아직 가입하지 않았는가 — 앱의 `auth-error.ts` */
  isSignupRequired: (error: unknown) => boolean;
}

export function useGatedNotificationList({
  api,
  app,
  resolveTarget,
  toErrorMessage,
  isUnauthenticated,
  isSignupRequired,
}: UseGatedNotificationListOptions): NotificationListState<NotificationGateStatus> {
  const router = useRouter();
  // 훅의 의존성에 그대로 들어가므로 렌더마다 같은 것이어야 한다
  const push = useCallback((href: string) => router.push(href), [router]);

  /** 첫 조회의 401·403 → 화면 상태. 밀어낼 로그인 화면이 없어 같은 자리에서 안내로 그린다 */
  const classifyStatus = useCallback(
    (error: unknown): NotificationGateStatus | null => {
      if (isUnauthenticated(error)) return "unauthenticated";
      if (isSignupRequired(error)) return "signup-required";
      return null;
    },
    [isUnauthenticated, isSignupRequired],
  );

  return useNotificationList<NotificationGateStatus>({
    api,
    app,
    resolveTarget,
    push,
    toErrorMessage,
    classifyStatus,
  });
}
