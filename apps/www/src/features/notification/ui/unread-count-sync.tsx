"use client";

import { useUnreadCountSync } from "../model/use-unread-count";

/** 배지 값을 듣는 빈 컴포넌트 — `AuthNav`의 로그인한 가지(`signedInSlot`)에 하나 (#616) */
export function UnreadCountSync() {
  useUnreadCountSync();
  return null;
}
