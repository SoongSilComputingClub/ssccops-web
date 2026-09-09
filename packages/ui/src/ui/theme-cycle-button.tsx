"use client";

import { THEMES, THEME_LABEL, type Theme, useTheme } from "../lib/theme";
import { cn } from "../lib/cn";

/** 아이콘은 지금 고른 값을 가리킨다 — 시스템은 반쪽, 밝게는 해, 어둡게는 달 */
const THEME_ICON: Record<Theme, string> = {
  system: "◐",
  light: "☀",
  dark: "☾",
};

/**
 * 테마를 한 버튼으로 돌려 고른다 — 시스템 → 밝게 → 어둡게 → 시스템 (ssccops-web#341).
 *
 * `ThemeToggle`(3버튼)과 **같은 상태를 본다**(둘 다 `useTheme` 구독) — 한쪽에서 바꾸면
 * 다른 쪽 표시도 함께 맞는다. 두 벌을 두는 이유는 붙는 자리의 폭이 다르기 때문이다.
 *
 * lms 상단 바에는 3버튼이 안 들어간다. 스터디장 화면의 목차가 일곱이라 로고·메뉴·로그아웃만
 * 828px이고, 토글(144px)을 더하면 컨테이너(960px)를 넘는다 — 넘치면 메뉴가 줄바꿈되어
 * 헤더가 두 줄이 된다. 그래서 좁은 자리에서는 이 버튼을, 넉넉한 자리(모바일 드로어 발치·
 * 어드민 사이드바 발치)에서는 `ThemeToggle`을 쓴다.
 *
 * **선택지를 감추는 대신 이름을 말해 준다.** 아이콘만으로는 지금 무엇이 골라져 있는지,
 * 누르면 무엇이 되는지 알 수 없어 `aria-label`·`title`에 둘 다 적는다 — 화면 문구 규칙(#117)
 * 대로 개발 용어 없이 평서형으로.
 */
export function ThemeCycleButton({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  const label = `화면 테마 ${THEME_LABEL[theme]} — 누르면 ${THEME_LABEL[next]}로 바뀝니다`;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 flex-none cursor-pointer items-center justify-center rounded-[10px]",
        "border border-line text-[15px] text-n400 hover:border-accent hover:text-accent",
        className,
      )}
    >
      <span aria-hidden>{THEME_ICON[theme]}</span>
    </button>
  );
}
