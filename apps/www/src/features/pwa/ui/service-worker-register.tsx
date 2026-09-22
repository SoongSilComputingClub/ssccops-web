"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@ssccops/pwa";
import { recordVisit } from "../model/install-banner-store";

/**
 * 서비스워커 등록 + 방문 세기 — 루트 레이아웃에 한 번 (#607 · ADR-0045 · admin #604와 같은 껍데기).
 *
 * 루트 레이아웃은 서버 컴포넌트라 effect를 둘 수 없어 이 껍데기가 필요하다. 그리는 것은 없다.
 * 개발 모드·미지원 브라우저는 패키지가 건너뛴다(`@ssccops/pwa` README «함정»). 방문 횟수를 여기서
 * 세는 것은 어느 화면으로 들어오든 루트 레이아웃은 한 번 마운트되기 때문이다(설치 띠는 홈·내
 * 활동에만 있다 — `install-banner-store.ts`).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker();
    recordVisit();
  }, []);
  return null;
}
