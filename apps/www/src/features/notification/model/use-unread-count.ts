"use client";

import { useEffect } from "react";
import { setUnreadCount } from "@ssccops/pwa";
import { notificationApi } from "@/entities/notification";

/*
 * 안 읽은 알림 수를 듣는다 — 진입 때 한 번, 탭이 다시 보일 때마다 (#616 · admin #604·lms #606과 같다).
 *
 * 한 곳에서만 부른다(`UnreadCountSync` · 루트 레이아웃이 `AuthNav`의 `signedInSlot`으로 넘기고, 그 슬롯은
 * 로그인했다고 판정된 뒤에만 마운트된다). **홈은 세션을 보지 않는다**는 규칙(ssccops#385)은 그대로다 —
 * 판정은 브라우저의 로컬 쿠키(`useAuthSession`)이고 이 요청은 판정 뒤에만, 브라우저에서만 나간다. SSR
 * HTML에는 배지가 없다(스토어의 서버 스냅샷이 null).
 *
 * **실패는 조용하다.** 서버가 아직 이 경로를 모르거나 연결이 없거나 미가입(403)이면 배지를 안 그릴 뿐
 * 아무 안내도 없다 — 알림 수는 화면의 주역이 아니다.
 */
export function useUnreadCountSync(): void {
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      notificationApi
        .unreadCount()
        .then((res) => {
          if (!cancelled) setUnreadCount(res.unreadCount);
        })
        .catch(() => undefined);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
