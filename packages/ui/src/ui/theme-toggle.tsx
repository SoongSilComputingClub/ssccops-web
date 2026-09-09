"use client";

import { THEMES, THEME_LABEL, type Theme, useTheme } from "../lib/theme";
import { cn } from "../lib/cn";

/**
 * 테마 고르기 — 시스템 · 밝게 · 어둡게 (ssccops#226 · ssccops-web#341).
 *
 * `Segmented`를 쓰지 않고 여기서 직접 그리는 것은 그쪽이 `flex-1`로 폭을 채우고
 * 세로 여백이 커서, 사이드바 발치의 좁은 자리에는 목록보다 무거워 보이기 때문이다.
 * 어휘와 선택 표시는 같게 뒀다.
 *
 * **admin에서 공유로 올렸다**(#341) — lms가 같은 것을 쓴다. 붙는 자리가 앱마다 달라
 * (admin은 사이드바 발치, lms는 모바일 드로어 안) 바깥 여백은 `className`으로 받는다.
 *
 * ── `fit`: 폭을 내용만큼만 쓴다 (#349) ───────────────────────
 * 기본값은 **붙는 자리의 폭을 채우는 것**이다(`flex-1`). 사이드바 발치·드로어 발치처럼
 * 한 줄을 통째로 내주는 자리에서는 그래야 세 칸이 고르게 나뉜다.
 *
 * lms 상단 바는 그 자리가 아니다 — 로고·메뉴·로그아웃과 한 줄을 나눠 쓰므로 폭을 채우면
 * 남는 자리를 다 먹는다. `fit`은 `flex-1`을 빼고 좌우 여백을 8px로 준다. **admin은 이 인자를
 * 주지 않으므로 지금 모양 그대로다** — 공유 컴포넌트라 기본값을 바꾸면 admin이 함께 움직인다.
 *
 * 8px인 이유는 실측이다(#349). lms 상단 바에서 스터디장 목차(일곱)까지 세웠을 때 로고 105 +
 * 메뉴 580 + 로그아웃 + 이 토글 141이 가용 944 안에 들어가 26px이 남는다. 여백을 주지 않아도
 * (165px) 2px 차이로 들어가지만, 그 정도는 글꼴이 조금만 달라져도 뒤집혀 메뉴가 줄바꿈된다.
 * 삭제된 `ThemeCycleButton`은 이 자리에 3버튼이 **안 들어간다**는 계산(`828 + 144 > 960`)을
 * 근거로 두고 있었는데, 그 숫자가 실측과 맞지 않았다.
 */
export function ThemeToggle({ className, fit }: { className?: string; fit?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="화면 테마"
      className={cn("flex rounded-[10px] border border-line bg-surface p-[2px]", className)}
    >
      {THEMES.map((t: Theme) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => setTheme(t)}
          className={cn(
            "cursor-pointer rounded-[8px] py-[5px] text-center text-[12.5px] transition-colors",
            fit ? "px-[8px]" : "flex-1",
            theme === t
              ? "bg-accent-soft font-semibold text-accent"
              : "text-n500 hover:text-n300",
          )}
        >
          {THEME_LABEL[t]}
        </button>
      ))}
    </div>
  );
}
