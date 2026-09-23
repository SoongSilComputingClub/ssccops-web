"use client";

import { createNotificationApi, type PushApp } from "@ssccops/pwa";
import { apiFetchAuthedFromBrowser } from "@/shared/api/browser-client";

/*
 * `/v1/notifications` — 내 알림 (#616 · ssccops#453 · ADR-0045 · #665).
 *
 * 호출 한 벌은 `@ssccops/pwa`의 `createNotificationApi`다 — 경로·파라미터·응답은 계약 표(ssccops#446)가
 * 정하는 하나라 세 앱이 같은 것을 쓴다(`app` 필터 · 커서 페이징 · 읽음 처리 · 안 읽은 수). 여기서 꽂는
 * 것은 **누가 보내느냐**와 이 앱이 어느 앱이냐다.
 *
 * **브라우저 통로다.** 이 앱은 전 화면을 SSR로 그리지만(AGENTS.md) 알림은 «읽음 처리·더 보기»가 붙는
 * 화면이고 종 배지는 탭이 다시 보일 때마다 새로 듣는다 — 신청서·공개 폼의 초안 저장처럼 브라우저에서
 * 저장하는 것들과 같은 자리(`browser-client.ts`)다. 401·403은 오류로 올라오고 화면이 안내로 그린다
 * (리다이렉트 없음).
 *
 * 회원이 여기서 받는 알림은 낸 응답의 검토 결과(`RESPONSE_*` → `/me/responses`·`/me/proposals`)와 행사
 * 참가 상태(`APPLICATION_*` → `/me/applications`)다. 운영진 계정이면 어드민 사건(`app = ADMIN`)도 같은
 * 목록에 온다 — 알림은 회원 단위라 앱마다 갈라 두지 않는다(ssccops#448).
 */

/** 이 앱 — 목록·배지의 기본 필터이자 `NotificationList`의 `currentApp` (#643) */
export const CURRENT_APP: PushApp = "WWW";

export const notificationApi = createNotificationApi(apiFetchAuthedFromBrowser);

export type { NotificationItem, NotificationPage } from "@ssccops/pwa";
