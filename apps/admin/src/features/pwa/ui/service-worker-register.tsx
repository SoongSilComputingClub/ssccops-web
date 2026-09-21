"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@ssccops/pwa";

/**
 * 서비스워커 등록 — 루트 레이아웃에 한 번 (#604 · ADR-0045).
 *
 * 루트 레이아웃은 서버 컴포넌트라 effect를 둘 수 없어 이 껍데기가 필요하다. 그리는 것은 없다.
 * 개발 모드·미지원 브라우저는 패키지가 건너뛴다(`@ssccops/pwa` README «함정»).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
