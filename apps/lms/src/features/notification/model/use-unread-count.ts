"use client";

import { useEffect } from "react";
import { setUnreadCount } from "@ssccops/pwa";
import { notificationApi } from "@/entities/notification";

/*
 * 안 읽은 알림 수를 듣는다 — 진입 때 한 번, 탭이 다시 보일 때마다 (#606 · ssccops#448 · 어드민 #604와 같다).
 *
 * 한 곳에서만 부른다(`UnreadCountSync` · 상단 바 `AuthNav`의 로그인한 가지 안). 어드민처럼 `AuthGate`가
 * 없어 그 자리가 «로그인했다고 판정된 뒤»다 — 미로그인이면 `browser-client`가 서버에 보내지도 않고
 * `CLIENT_UNAUTHENTICATED`로 끊지만, 그것도 요청 하나이므로 판정 뒤에만 마운트한다.
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
