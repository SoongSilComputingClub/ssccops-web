"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { groupHasActive, type NavGroup } from "./nav";

/** 사용자가 직접 연/닫은 묶음 — `{ [group.id]: boolean }` */
const STORAGE_KEY = "admin-nav-open";

type Manual = Readonly<Record<string, boolean>>;

const EMPTY: Manual = {};

/*
 * localStorage 위의 외부 스토어 (`use-event-view-mode.ts`와 같은 모양).
 *
 * `useSyncExternalStore`인 것은 localStorage가 서버 렌더에 없기 때문이다 — 서버 스냅샷은 빈 기억이고
 * 클라이언트가 하이드레이션 뒤 저장값으로 바꾼다(effect 안에서 setState 하는 길은 React 컴파일러
 * 린트가 막는다). 스냅샷은 원문이 같으면 같은 객체를 돌려준다 — 매번 새로 파싱하면 무한 렌더다.
 * 저장소가 막힌 창(사생활 보호)에서는 `memory`가 이번 세션의 기억을 든다.
 */
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: Manual = EMPTY;
let memory: Manual | null = null;

function parse(raw: string): Manual {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return EMPTY;
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

function read(): Manual {
  if (memory) return memory;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cached;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    cached = raw ? parse(raw) : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 연/닫은 것도 따라간다
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function write(next: Manual) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    memory = next;
  }
  listeners.forEach((l) => l());
}

/**
 * 목차 아코디언 상태 (#635 · ssccops#462).
 *
 * ── 규칙 ───────────────────────────────────────────────────────
 * - **기본은 현재 화면이 속한 묶음만 펼침.** 묶음 7개·항목 25개를 다 펼치면 한 화면을 넘겼다.
 * - **사용자가 연/닫은 것은 localStorage(`admin-nav-open`)에 기억한다.** 기억은 «직접 만진 묶음»
 *   에만 있다 — 기억이 없는 묶음은 활성 여부를 따른다. 그래서 새 화면으로 옮기면 그 묶음이
 *   저절로 열리고, 전에 열어 둔 다른 묶음은 열린 채 남는다.
 * - **활성 묶음이 바뀌면 그 묶음은 연다.** 전에 닫아 두었더라도 — 지금 보는 화면이 목차 어디에
 *   있는지는 보여야 한다(닫힌 채 두면 현재 항목이 목차에 없다). 같은 묶음 안에서 화면을 옮길 때는
 *   닫아 둔 것을 다시 열지 않는다(사용자가 방금 닫은 것을 화면이 되돌리면 안 된다).
 *
 * 사이드바와 드로어가 각자 이 훅을 들지만 스토어는 모듈 하나라 같은 기억을 본다.
 */
export function useNavAccordion(groups: NavGroup[], pathname: string) {
  const manual = useSyncExternalStore(subscribe, read, () => EMPTY);

  const activeId = useMemo(
    () => groups.find((g) => groupHasActive(g, pathname))?.id,
    [groups, pathname],
  );

  // 활성 묶음이 바뀌면 닫아 둔 기억을 지운다 — 활성이면 기본이 «열림»이라 기억을 지우는 것으로 충분하다
  useEffect(() => {
    if (!activeId) return;
    const current = read();
    if (current[activeId] !== false) return;
    write(Object.fromEntries(Object.entries(current).filter(([id]) => id !== activeId)));
  }, [activeId]);

  const isOpen = useCallback(
    (id: string) => manual[id] ?? id === activeId,
    [manual, activeId],
  );

  const toggle = useCallback((id: string) => write({ ...manual, [id]: !isOpen(id) }), [manual, isOpen]);

  const open = useCallback((id: string) => write({ ...manual, [id]: true }), [manual]);

  return { isOpen, toggle, open };
}
