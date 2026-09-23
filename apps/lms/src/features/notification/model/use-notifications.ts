"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useNotificationList,
  type NotificationGateStatus,
  type NotificationStatus,
} from "@ssccops/pwa";
import { CURRENT_APP, notificationApi } from "@/entities/notification";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { notificationTarget } from "./notification-href";
import { toNotificationErrorMessage } from "./notification-error";

/*
 * `/notifications` — 목록·«더 보기»·읽음 처리·이동 (#606 · ssccops#448 · #665).
 *
 * 몸통은 `@ssccops/pwa`의 `useNotificationList`다 — 커서 페이징·범위 칩(#643 · ADR-0047)·«배지는
 * 언제나 이 앱 수» 규칙은 세 앱이 같고 그쪽 주석이 정본이다. 여기 남은 것은 이 앱 것뿐이다.
 *
 * 이 앱의 `apiFetch`는 401·403을 리다이렉트하지 않고 오류로 올린다 — 그래서 상태에 `unauthenticated`·
 * `signup-required`가 따로 있고 화면이 로그인 게이트·가입 안내를 그린다(`classifyStatus`). «모두 읽음»
 * 실패는 전역 토스트가 없어(`features/share` 주석) 훅의 `actionError` 한 줄로 목록 위에 보인다.
 *
 * 종 배지는 `@ssccops/pwa`의 모듈 스토어(`setUnreadCount`·`decrementUnreadCount`)가 기본이라 따로
 * 꽂지 않는다.
 */

export type NotificationListStatus = NotificationStatus<NotificationGateStatus>;

/** 첫 조회의 401·403 → 화면 상태. 밀어낼 로그인 화면이 없어 같은 자리에서 게이트로 그린다 */
function classifyStatus(error: unknown): NotificationGateStatus | null {
  if (isUnauthenticated(error)) return "unauthenticated";
  if (isSignupRequired(error)) return "signup-required";
  return null;
}

export function useNotifications() {
  const router = useRouter();
  // 훅의 의존성에 그대로 들어가므로 렌더마다 같은 것이어야 한다
  const push = useCallback((href: string) => router.push(href), [router]);

  return useNotificationList({
    api: notificationApi,
    app: CURRENT_APP,
    resolveTarget: notificationTarget,
    push,
    toErrorMessage: toNotificationErrorMessage,
    classifyStatus,
  });
}
