"use client";

import {
  useGatedNotificationList,
  type NotificationGateStatus,
  type NotificationStatus,
} from "@ssccops/pwa";
import { CURRENT_APP, notificationApi } from "@/entities/notification";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { notificationTarget } from "./notification-href";
import { toNotificationErrorMessage } from "./notification-error";

/*
 * `/notifications` — 목록·«더 보기»·읽음 처리·이동 (#616 · ssccops#453 · #665 · #671).
 *
 * 몸통도 배선도 `@ssccops/pwa`다 — 커서 페이징·범위 칩(#643 · ADR-0047)·«배지는 언제나 이 앱 수»
 * 규칙은 세 앱이 같고, 라우터 이동과 401·403 판정의 배선은 lms와 같아 `useGatedNotificationList`로
 * 올렸다(#671). 그쪽 주석이 정본이고 여기 남은 것은 이 앱의 값 다섯이다.
 *
 * 이 앱의 `apiFetch`는 401·403을 리다이렉트하지 않고 오류로 올린다 — 그래서 상태에 `unauthenticated`·
 * `signup-required`가 따로 있고 화면이 로그인 안내·가입 안내를 그린다. 판정은 이 앱의 `ApiError`를
 * 아는 `shared/api/auth-error.ts`가 하고 패키지는 그 둘을 받는다. «모두 읽음» 실패는 전역 토스트가
 * 없어 훅의 `actionError` 한 줄로 목록 위에 보인다(기본값 그대로).
 *
 * 종 배지는 `@ssccops/pwa`의 모듈 스토어(`setUnreadCount`·`decrementUnreadCount`)가 기본이라 따로
 * 꽂지 않는다.
 */

export type NotificationListStatus = NotificationStatus<NotificationGateStatus>;

export function useNotifications() {
  return useGatedNotificationList({
    api: notificationApi,
    app: CURRENT_APP,
    resolveTarget: notificationTarget,
    toErrorMessage: toNotificationErrorMessage,
    isUnauthenticated,
    isSignupRequired,
  });
}
