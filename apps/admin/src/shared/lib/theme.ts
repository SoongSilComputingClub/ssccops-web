/*
 * 화면 테마 — 구현은 `@ssccops/ui`에 있다 (ssccops#226에서 여기 만들었고 ssccops-web#341에서 옮겼다).
 *
 * lms가 같은 것을 쓰게 되면서 올렸다. 여기를 재export로 남기는 것은 `@/shared/lib/theme`을
 * 부르는 자리를 건드리지 않기 위해서다(`shared/lib/cn.ts`와 같은 방식).
 */
export { THEMES, THEME_LABEL, THEME_INIT_SCRIPT, useTheme, type Theme } from "@ssccops/ui";
