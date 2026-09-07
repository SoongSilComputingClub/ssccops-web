"use client";

import { useSyncExternalStore } from "react";

/**
 * 화면 테마 (ssccops#226).
 *
 * 값이 셋인 것은 **"아무것도 고르지 않음"이 실제 상태**이기 때문이다. 둘(밝게·어둡게)만
 * 두면 처음 들어온 사람에게 하나를 골라 줘야 하고, 그 순간 OS를 어둡게 쓰는 사람이
 * 밝은 화면을 받는다. `system`은 `data-theme`를 아예 붙이지 않아 CSS의
 * `prefers-color-scheme`가 판단하게 둔다 — 그래서 OS 설정을 바꾸면 새로고침 없이 따라온다.
 */
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** 표시명 — 화면 문구 규칙(#117)대로 짧고 평서형 */
export const THEME_LABEL: Record<Theme, string> = {
  system: "시스템",
  light: "밝게",
  dark: "어둡게",
};

const KEY = "sscc-theme";

/*
 * 서버에 회원 설정 컬럼이 없어 localStorage에 둔다 (있으면 데이터사전 등재가 선행이다).
 * 그래서 이 선택은 **브라우저마다 따로**이며 기기를 옮기면 다시 골라야 한다 — 테마는
 * 그 기기의 화면 밝기에 따라 달라지는 값이라 오히려 자연스럽다.
 */
function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return THEMES.includes(v as Theme) ? (v as Theme) : "system";
  } catch {
    // 사생활 보호 모드 등에서 접근 자체가 던진다 — 그때는 시스템을 따른다
    return "system";
  }
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.dataset.theme = theme;
}

/**
 * 첫 페인트 전에 저장된 선택을 `<html>`에 박는 스크립트 (FOUC 차단).
 *
 * React가 붙은 뒤에 적용하면 **밝은 화면이 한 번 번쩍이고** 어두워진다. 그래서 이것만은
 * 훅이 아니라 `<head>`에서 동기로 돌려야 한다. 실패해도 조용히 넘어가는 것은, 여기서
 * 던지면 그 아래 스크립트가 통째로 멈춰 화면이 아예 뜨지 않기 때문이다.
 *
 * `system`일 때 아무것도 하지 않는 것이 요점이다 — 속성이 없어야 CSS의
 * `prefers-color-scheme`가 판단한다.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(
  KEY,
)});if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

/*
 * 브라우저 저장소는 React 밖의 상태라 `useSyncExternalStore`로 읽는다.
 *
 * `useEffect`에서 setState로 끌어오면 `react-hooks/set-state-in-effect`에 걸리고, 무엇보다
 * **토글이 두 곳에 그려진다** — NavPanel 마크업 한 벌을 사이드바와 모바일 드로어가 함께 쓰므로
 * 각자 상태를 쥐면 한쪽에서 바꾼 것이 다른 쪽에 안 보인다. 구독으로 두면 둘이 같은 값을 본다.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // 다른 탭에서 바꾼 선택도 따라온다 — storage 이벤트는 그쪽 창에서만 온다
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * 고른 테마를 읽고 바꾼다.
 *
 * 서버 스냅샷이 `system`인 것은 **서버가 localStorage를 모르기** 때문이다. 실제 화면은 이미
 * `THEME_INIT_SCRIPT`가 칠해 놓았으므로 이 값이 잠깐 어긋나도 보이는 것은 바뀌지 않는다 —
 * 토글의 선택 표시만 마운트 뒤에 맞는다.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);

  const setTheme = (next: Theme) => {
    apply(next);
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // 저장에 실패해도 이번 방문에는 적용된다 — 다음에 다시 고르면 된다
    }
    listeners.forEach((l) => l());
  };

  return { theme, setTheme };
}
