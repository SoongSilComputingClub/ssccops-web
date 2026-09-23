"use client";

import { useUnreadCountSync } from "@ssccops/pwa";
import { CURRENT_APP, notificationApi } from "@/entities/notification";

/*
 * 배지 값을 듣는 빈 컴포넌트 — 상단 바 `AuthNav`의 로그인한 가지 안에 하나 (#606 · ssccops#448 · #671).
 *
 * 듣는 규칙(진입 때 한 번 · `visibilitychange`마다 · 실패는 조용히 · `app` 필터)은 세 앱이 같아
 * `@ssccops/pwa`의 `useUnreadCountSync`에 있고 여기는 자리와 값 둘뿐이다. 어드민처럼 `AuthGate`가
 * 없어 그 자리가 «로그인했다고 판정된 뒤»다 — 미로그인이면 `browser-client`가 서버에 보내지도 않고
 * `CLIENT_UNAUTHENTICATED`로 끊지만, 그것도 요청 하나이므로 판정 뒤에만 마운트한다.
 */
export function UnreadCountSync() {
  useUnreadCountSync({ api: notificationApi, app: CURRENT_APP });
  return null;
}
