"use client";

import { useEffect } from "react";
import type { NotificationApi } from "./notification-api";
import type { PushApp } from "./service-worker";
import { setUnreadCount } from "./unread-store";

/*
 * 안 읽은 알림 수를 듣는다 — 진입 때 한 번, 탭이 다시 보일 때마다 (#671 · admin #604 · lms #606 · www #616).
 *
 * 세 앱이 글자까지 같은 훅을 각자 갖고 있었다(42·41·19줄). 조회도 규칙도 계약이 정하는 하나고 갈리는
 * 것은 «누가 보내느냐»(`api`)·«이 앱이 무엇이냐»(`app`)·«어느 스토어에 넣느냐»(`setUnread`)뿐이라 몸통을
 * 여기 한 벌만 둔다.
 *
 * **한 앱에서 한 곳만 부른다**(`UnreadCountSync` 빈 컴포넌트) — 종이 사이드바·상단 바 두 자리에 있는
 * 앱에서 각자 부르면 조회가 둘이 되고, 로그인 판정 밖에서 부르면 가입 전(403) 회원의 실패가 여기서도
 * 난다. 어디에 꽂는지는 앱마다 다르다(admin은 `AuthGate` 안, www·lms는 `AuthNav`의 로그인한 가지).
 *
 * **배지는 언제나 «이 앱» 수다**(#643 · ADR-0047) — 조회에 `app`을 실어 기준표가 이 앱을 수신 앱으로
 * 둔 알림만 센다. 목록의 «전체» 칩은 이 값을 건드리지 않는다.
 *
 * **실패는 조용하다.** 서버가 아직 이 경로를 모르거나 연결이 없거나 미가입(403)이면 배지를 안 그릴 뿐
 * 아무 안내도 없다 — 알림 수는 화면의 주역이 아니다. 앱의 `apiFetch`가 401을 재로그인으로 끝내는
 * 앱(admin)에서는 그것이 그대로 돈다(다른 요청과 같은 세션이다).
 */
export interface UseUnreadCountSyncOptions {
  /** `createNotificationApi(앱의 apiFetch)` */
  api: NotificationApi;
  /** 이 앱 — 조회의 `app` 필터 (#643) */
  app: PushApp;
  /**
   * 들은 값을 넣을 자리. 기본은 이 패키지의 모듈 스토어(`useUnreadCount`가 읽는다)이고 admin이 자기
   * zustand 스토어의 setter를 꽂는다. **렌더마다 같은 것이어야 한다**(모듈 함수 · zustand 셀렉터).
   */
  setUnread?: (count: number) => void;
}

export function useUnreadCountSync({
  api,
  app,
  setUnread = setUnreadCount,
}: UseUnreadCountSyncOptions): void {
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      api
        .unreadCount({ app })
        .then((res) => {
          if (!cancelled) setUnread(res.unreadCount);
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
  }, [api, app, setUnread]);
}
