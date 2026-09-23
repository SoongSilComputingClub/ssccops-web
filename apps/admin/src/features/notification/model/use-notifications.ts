"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useNotificationList, type NotificationStatus } from "@ssccops/pwa";
import { CURRENT_APP, notificationApi, useUnreadStore } from "@/entities/notification";
import { flash } from "@/shared/ui";
import { notificationTarget } from "./notification-href";
import { toNotificationErrorMessage } from "./notification-error";

/*
 * `/notifications` — 목록·«더 보기»·읽음 처리·이동 (#604 · ssccops#447 · #665).
 *
 * 몸통은 `@ssccops/pwa`의 `useNotificationList`다 — 커서 페이징·범위 칩(#643 · ADR-0047)·«배지는
 * 언제나 이 앱 수» 규칙은 세 앱이 같고 그쪽 주석이 정본이다. 여기 남은 것은 이 앱 것뿐이다.
 *
 * 이 앱의 `apiFetch`가 401(재로그인)·403 `SIGNUP_REQUIRED`(가입 화면)를 리다이렉트로 끝내므로
 * `classifyStatus`를 넘기지 않는다 — 상태는 `loading`·`ready`·`error` 셋이다. «모두 읽음» 실패는
 * 토스트(`flash`)라 `onActionError`로 꽂는다.
 *
 * 종 배지는 이 앱의 zustand 스토어(`entities/notification/model/unread-store`)다 — 사이드바와 상단
 * 바 두 자리의 종이 그것을 보고 있어 `setUnread`·`decrementUnread`로 꽂는다(패키지 모듈 스토어로
 * 바꾸는 것은 따로 · `packages/pwa/README.md`).
 */

export type NotificationListStatus = NotificationStatus;

export function useNotifications() {
  const router = useRouter();
  // 훅의 의존성에 그대로 들어가므로 렌더마다 같은 것이어야 한다(zustand 셀렉터도 그렇다)
  const push = useCallback((href: string) => router.push(href), [router]);
  const setUnread = useUnreadStore((s) => s.setUnreadCount);
  const decrementUnread = useUnreadStore((s) => s.decrement);

  return useNotificationList({
    api: notificationApi,
    app: CURRENT_APP,
    resolveTarget: notificationTarget,
    push,
    toErrorMessage: toNotificationErrorMessage,
    setUnread,
    decrementUnread,
    onActionError: flash,
  });
}
