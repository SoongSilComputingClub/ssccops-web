"use client";

import { useEffect } from "react";
import { notificationApi, useUnreadStore } from "@/entities/notification";

/*
 * 안 읽은 알림 수를 듣는다 — 진입 때 한 번, 탭이 다시 보일 때마다 (#604 · ssccops#447).
 *
 * 한 곳에서만 부른다(`UnreadCountSync` · `(admin)/layout.tsx`의 AuthGate 안). 종은 사이드바와 상단
 * 바 두 자리에 있어 각자 부르면 조회가 둘이 되고, AuthGate 밖에서 부르면 가입 전(signup-required)
 * 회원의 403이 여기서도 난다.
 *
 * **실패는 조용하다.** 서버가 아직 이 경로를 모르거나(병렬 진행) 연결이 없으면 배지를 안 그릴 뿐
 * 토스트를 띄우지 않는다 — 알림 수는 화면의 주역이 아니다. 단, `apiFetch`의 401 재로그인은 그대로
 * 돈다(다른 요청과 같은 세션이다).
 */
export function useUnreadCountSync(): void {
  const setUnreadCount = useUnreadStore((s) => s.setUnreadCount);

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
  }, [setUnreadCount]);
}
