"use client";

import { useSyncExternalStore } from "react";

/*
 * 안 읽은 알림 수 — 종 배지와 `/notifications` 화면이 같은 값을 본다 (ssccops#447 · #606).
 *
 * 종은 셸(상단 바)에 있고 목록 화면은 본문에 있어 props로 이을 길이 없다. 목록에서 한 건을 읽거나
 * «모두 읽음»을 누르면 종이 그 자리에서 줄어야 하므로 값 하나를 모듈에 둔다. 서버가 정본이고 여기는
 * 마지막으로 들은 값이다 — 듣는 것은 앱의 훅(진입·`visibilitychange`마다 `GET /v1/notifications/unread-count`).
 *
 * zustand가 아니라 `useSyncExternalStore`인 것은 이 패키지가 react 말고는 의존성을 두지 않아서다 —
 * lms에는 zustand가 없다. admin(#604)은 `entities/notification/model/unread-store.ts`에 zustand로 같은
 * 것을 갖고 있다 — 다음 admin 작업에서 이것으로 바꾼다.
 *
 * 서버 스냅샷은 `null`(아직 못 들었다)이라 SSR HTML에 배지가 찍히지 않는다.
 */

let unreadCount: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => unreadCount;
const getServerSnapshot = () => null;

/** 서버에서 들은 값으로 맞춘다 */
export function setUnreadCount(count: number): void {
  unreadCount = Math.max(0, count);
  emit();
}

/** 읽음 처리 직후 서버를 다시 묻지 않고 하나 뺀다. 아직 한 번도 못 들었으면 그대로 둔다 */
export function decrementUnreadCount(): void {
  if (unreadCount === null) return;
  unreadCount = Math.max(0, unreadCount - 1);
  emit();
}

/** 아직 한 번도 못 들었으면 null — 배지를 그리지 않는다 */
export function useUnreadCount(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
