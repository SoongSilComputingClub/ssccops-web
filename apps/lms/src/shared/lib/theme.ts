/*
 * 화면 테마 — 구현은 `@ssccops/ui`에 있다 (ssccops#226이 admin에 만들었고 #341에서 올렸다).
 *
 * `shared/lib/cn.ts`와 같은 방식의 재export다 — 화면은 `@/shared/lib/theme`만 보면 된다.
 */
export { THEMES, THEME_LABEL, THEME_INIT_SCRIPT, useTheme, type Theme } from "@ssccops/ui";
