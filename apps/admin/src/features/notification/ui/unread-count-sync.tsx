"use client";

import { useUnreadCountSync } from "@ssccops/pwa";
import { CURRENT_APP, notificationApi, useUnreadStore } from "@/entities/notification";

/*
 * 배지 값을 듣는 빈 컴포넌트 — `(admin)/layout.tsx`의 AuthGate 안에 하나 (#604 · ssccops#447 · #671).
 *
 * 듣는 규칙(진입 때 한 번 · `visibilitychange`마다 · 실패는 조용히 · `app` 필터)은 세 앱이 같아
 * `@ssccops/pwa`의 `useUnreadCountSync`에 있고 여기는 자리와 값 셋뿐이다. 종은 사이드바와 상단 바 두
 * 자리에 있어 각자 부르면 조회가 둘이 되고, AuthGate 밖에서 부르면 가입 전(signup-required) 회원의
 * 403이 여기서도 난다. 값을 넣을 자리는 이 앱의 zustand 스토어다(두 자리의 종이 그것을 보고 있다) —
 * 패키지 모듈 스토어로 바꾸는 것은 따로(`packages/pwa/README.md`). 셀렉터는 렌더마다 같은 것이라
 * 훅의 의존성에 그대로 들어간다.
 */
export function UnreadCountSync() {
  const setUnread = useUnreadStore((s) => s.setUnreadCount);
  useUnreadCountSync({ api: notificationApi, app: CURRENT_APP, setUnread });
  return null;
}
