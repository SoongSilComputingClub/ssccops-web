"use client";

import { useUnreadCountSync } from "@ssccops/pwa";
import { CURRENT_APP, notificationApi } from "@/entities/notification";

/*
 * 배지 값을 듣는 빈 컴포넌트 — `AuthNav`의 로그인한 가지(`signedInSlot`)에 하나 (#616 · #671).
 *
 * 듣는 규칙(진입 때 한 번 · `visibilitychange`마다 · 실패는 조용히 · `app` 필터)은 세 앱이 같아
 * `@ssccops/pwa`의 `useUnreadCountSync`에 있고 여기는 자리와 값 둘뿐이다. **홈은 세션을 보지 않는다**는
 * 규칙(ssccops#385)은 그대로다 — 판정은 브라우저의 로컬 쿠키(`useAuthSession`)이고 이 요청은 판정
 * 뒤에만, 브라우저에서만 나간다. SSR HTML에는 배지가 없다(스토어의 서버 스냅샷이 null).
 */
export function UnreadCountSync() {
  useUnreadCountSync({ api: notificationApi, app: CURRENT_APP });
  return null;
}
