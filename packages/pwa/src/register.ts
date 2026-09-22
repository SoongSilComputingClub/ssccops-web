/*
 * 서비스워커 등록·캐시 비우기 (ADR-0045).
 *
 * 브라우저에서만 부른다 — 앱의 루트 레이아웃이 작은 클라이언트 컴포넌트에서 effect로 한 번 부른다.
 */

/** 등록 경로 — 앱의 `app/sw.js/route.ts`와 같은 값 */
export const SERVICE_WORKER_PATH = "/sw.js";

/**
 * 서비스워커를 등록한다. **개발 모드(`NODE_ENV !== "production"`)에서는 등록하지 않는다** —
 * `next dev`는 조각 주소가 요청마다 바뀌고 HMR이 붙어 있어, 캐시 우선 규칙이 끼면 «고쳤는데 안
 * 바뀐다»가 된다. 미지원 브라우저(iOS 미설치 Safari 일부·프라이빗 창)는 조용히 건너뛴다.
 *
 * `process.env.NODE_ENV`는 `NEXT_PUBLIC_*`과 달리 번들러가 **모든 모듈**에 값을 박으므로 패키지
 * 안에서 읽어도 된다(`@ssccops/ui`의 «`process.env`를 읽지 않는다»는 `NEXT_PUBLIC_*` 이야기다).
 *
 * 실패는 삼킨다 — 등록이 안 되면 그냥 예전처럼 서비스워커 없는 웹이다. 콘솔에만 남긴다.
 */
export function registerServiceWorker(path: string = SERVICE_WORKER_PATH): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") return;
  navigator.serviceWorker.register(path, { scope: "/" }).catch((error: unknown) => {
    console.warn("[pwa] 서비스워커 등록 실패", error);
  });
}

/**
 * 서비스워커에 캐시를 전부 비우라고 보낸다 — 로그아웃 때 부른다. 남의 기기에서 로그아웃했는데
 * 내 목록이 캐시에 남아 오프라인으로 열리는 일을 막는다.
 *
 * 등록된 워커가 없으면(개발 모드·미지원) 아무 일도 없다. 이 페이지를 제어하는 워커(`controller`)가
 * 있으면 동기로 바로 보내고, 없을 때(첫 로드 직후 `clients.claim` 전)만 등록을 찾는다. 메시지는 보낸
 * 것으로 끝이고 워커의 삭제 완료를 기다리지 않는다 — 호출부는 이 프로미스 뒤에 전체 이동을 걸면 되고,
 * 그래도 남는 것은 다음 CLEAR_CACHE나 새 버전의 activate가 지운다.
 */
export async function clearServiceWorkerCache(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const controller = navigator.serviceWorker.controller;
  if (controller) {
    controller.postMessage({ type: "CLEAR_CACHE" });
    return;
  }
  const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);
  registration?.active?.postMessage({ type: "CLEAR_CACHE" });
}
