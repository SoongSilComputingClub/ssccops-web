import { createNotificationApi, type PushApp } from "@ssccops/pwa";
import { apiFetch } from "@/shared/lib/api/client";

/*
 * `/v1/notifications` — 내 알림 (#604 · ssccops#446 «API 계약» · ADR-0045 · #665).
 *
 * 호출 한 벌은 `@ssccops/pwa`의 `createNotificationApi`다 — 경로·파라미터·응답은 계약 표가 정하는
 * 하나라 세 앱이 같은 것을 쓴다(`app` 필터 · 커서 페이징 · 읽음 처리 · 안 읽은 수). 여기서 꽂는 것은
 * **누가 보내느냐**와 이 앱이 어느 앱이냐다.
 *
 * 이 앱의 `apiFetch`만 401(재로그인)·403 `SIGNUP_REQUIRED`(가입 화면)의 리다이렉트까지 끝낸다 —
 * 그래서 목록 화면에 로그인·가입 안내 상태가 없다(www·lms는 오류로 올려 화면이 그린다).
 */

/** 이 앱 — 목록·배지의 기본 필터이자 `NotificationList`의 `currentApp` (#643) */
export const CURRENT_APP: PushApp = "ADMIN";

export const notificationApi = createNotificationApi(apiFetch);

export type { NotificationItem, NotificationPage } from "@ssccops/pwa";
