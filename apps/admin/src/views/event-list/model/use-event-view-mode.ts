"use client";

import { useSyncExternalStore } from "react";

/** 행사 목록의 두 모양 (#569 · ssccops#424). 세그먼트에 그대로 글자로 나간다 */
export const EVENT_VIEW_MODES = ["카드", "리스트"] as const;
export type EventViewMode = (typeof EVENT_VIEW_MODES)[number];

const STORAGE_KEY = "ssccops.admin.events.view";
const DEFAULT_MODE: EventViewMode = "카드";

/*
 * 카드·리스트 선택을 브라우저에 기억한다.
 *
 * URL 쿼리에 두지 않는 것은 상태·분류 필터와 성격이 달라서다 — 필터는 «무엇을 보나»라 링크로
 * 공유할 값이지만, 보기는 «어떻게 보나»라 사람마다 다르고 한 번 고르면 다음에 들어와도 그대로여야
 * 한다(Notion이 뷰를 기억하는 것과 같다).
 *
 * `useSyncExternalStore`인 것은 localStorage가 서버 렌더에 없기 때문이다 — 서버 스냅샷은 기본값이고
 * 클라이언트가 하이드레이션 뒤 저장값으로 바꾼다(effect 안에서 setState 하는 길은 React 컴파일러
 * 린트가 막는다). 목록 자체가 그보다 늦게 오므로(로딩 스켈레톤) 눈에 보이는 깜빡임은 없다.
 * 저장·읽기는 try/catch — 사생활 창·차단된 저장소에서는 그냥 기본값이다.
 */
const listeners = new Set<() => void>();

function read(): EventViewMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "리스트" ? "리스트" : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 바꾼 것도 따라간다
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function write(next: EventViewMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* 기억하지 못하면 이 탭에서는 기본값이 남는다 — 저장소 없이 상태를 따로 들지 않는다 */
  }
  listeners.forEach((l) => l());
}

export function useEventViewMode(): [EventViewMode, (next: EventViewMode) => void] {
  const mode = useSyncExternalStore(subscribe, read, () => DEFAULT_MODE);
  return [mode, write];
}
