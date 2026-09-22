"use client";

import { useCallback, useSyncExternalStore } from "react";

/*
 * «홈 화면에 추가» (ssccops#447 · 1차 #108이 남긴 자리).
 *
 * Chrome·Edge·삼성 인터넷은 `beforeinstallprompt`를 주고 우리가 `prompt()`를 부른다. iOS Safari는
 * 그 이벤트가 없고 «공유 → 홈 화면에 추가»뿐이라 `isIos`로 안내 한 줄을 대신 그린다. 이미 설치된
 * 창(`display-mode: standalone`)에서는 둘 다 그리지 않는다.
 *
 * ── 이벤트는 모듈이 받아 둔다 ──────────────────────────────
 * `beforeinstallprompt`는 로드 직후 **한 번만** 오고, 훅이 마운트된 뒤에 듣기 시작하면 놓친다 — 드로어
 * 안의 항목처럼 열 때만 마운트되는 자리가 그렇다. 그래서 이 모듈이 평가되는 순간(앱 셸의 청크가
 * 실행될 때) 리스너를 걸어 이벤트를 모듈 변수에 쥐고, 훅은 `useSyncExternalStore`로 그 값을 읽는다.
 * `preventDefault`를 하지 않으면 브라우저가 제 미니바를 띄운다.
 */

/** `beforeinstallprompt` — lib.dom에 없는 Chrome 확장 이벤트 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => deferredPrompt;
const getServerSnapshot = () => null;

export interface InstallPromptControls {
  /** `beforeinstallprompt`를 받았고 아직 설치하지 않았다 */
  canInstall: boolean;
  /** 브라우저 설치 대화상자를 연다. 받아들이면 `canInstall`이 꺼진다 */
  install: () => Promise<void>;
  /** iPhone·iPad — 설치는 «공유 → 홈 화면에 추가»뿐이다 */
  isIos: boolean;
  /** 이미 설치된 창에서 열렸다 */
  isStandalone: boolean;
}

/*
 * iOS·설치 여부도 외부 값이라 `useSyncExternalStore`다 — 서버 스냅샷은 false라 SSR HTML과 첫
 * 클라이언트 렌더가 같고, 하이드레이션 뒤 실제 값이 된다(effect에서 setState로 갈아 끼우면 렌더가 한
 * 번 더 돌고 react-hooks 규칙이 잡는다).
 */
function detectIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+는 Macintosh로 자칭한다 — 터치 지점으로 가른다
  return /iPhone|iPad|iPod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function detectStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

const subscribeNever = () => () => {};
const getServerFalse = () => false;

/** 설치 뒤(`appinstalled`)와 창 모드가 바뀔 때 다시 판정한다 */
function subscribeStandalone(onChange: () => void): () => void {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
}

export function useInstallPrompt(): InstallPromptControls {
  const deferred = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isIos = useSyncExternalStore(subscribeNever, detectIos, getServerFalse);
  const isStandalone = useSyncExternalStore(subscribeStandalone, detectStandalone, getServerFalse);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // 이벤트는 한 번만 쓸 수 있다 — 거절해도 버리고, 다음 로드에서 다시 온다. 받아들이면 `appinstalled`가 온다
    deferredPrompt = null;
    notify();
  }, [deferred]);

  return { canInstall: deferred !== null && !isStandalone, install, isIos, isStandalone };
}
