"use client";

import { useUnreadCountSync } from "../model/use-unread-count";

/** 배지 값을 듣는 빈 컴포넌트 — `(admin)/layout.tsx`의 AuthGate 안에 하나 (#604) */
export function UnreadCountSync() {
  useUnreadCountSync();
  return null;
}
