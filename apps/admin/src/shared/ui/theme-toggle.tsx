"use client";

import { THEMES, THEME_LABEL, type Theme, useTheme } from "@/shared/lib/theme";
import { cn } from "@/shared/lib/cn";

/**
 * 테마 고르기 — 시스템 · 밝게 · 어둡게 (ssccops#226).
 *
 * `Segmented`를 쓰지 않고 여기서 직접 그리는 것은 그쪽이 `flex-1`로 폭을 채우고
 * 세로 여백이 커서, 사이드바 발치의 좁은 자리에는 목록보다 무거워 보이기 때문이다.
 * 어휘와 선택 표시는 같게 뒀다.
 */
export function ThemeToggle({ className }: { className?: string }) {
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
            "flex-1 cursor-pointer rounded-[8px] py-[5px] text-center text-[12.5px] transition-colors",
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
