"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "../register";

/**
 * 서비스워커 등록 — 앱 루트 레이아웃에 한 번 (ADR-0045 · #606에서 패키지로).
 *
 * 루트 레이아웃은 서버 컴포넌트라 effect를 둘 수 없어 이 껍데기가 필요하다. 그리는 것은 없다.
 * 개발 모드·미지원 브라우저는 `registerServiceWorker`가 건너뛴다(README «함정»). admin(#604)의
 * `features/pwa/ui/service-worker-register.tsx`와 같은 것이다 — lms(#606)가 같은 것을 쓰게 되어 올렸다.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
