"use client";

import { useSyncExternalStore } from "react";

/*
 * `navigator.onLine` + `online`/`offline` 이벤트 (ssccops#447).
 *
 * `useSyncExternalStore`인 것은 값이 React 밖(브라우저)에 있고 서버 렌더에는 없기 때문이다 —
 * 서버 스냅샷은 «온라인»이라 오프라인 띠가 SSR HTML에 찍히지 않고, 하이드레이션 뒤 실제 값으로
 * 바뀐다. `onLine`은 «네트워크 인터페이스가 있다»까지만 안다(연결은 있는데 서버가 죽은 경우는
 * true) — 그래서 띠는 안내이고, 실제 실패는 요청마다 `CLIENT_NETWORK_ERROR`로 온다.
 */

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const getSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
