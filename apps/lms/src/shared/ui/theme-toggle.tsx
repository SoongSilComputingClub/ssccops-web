/*
 * 테마 고르기 — 구현은 `@ssccops/ui`에 있다 (ssccops#226이 admin에 만들었고 #341에서 올렸다).
 *
 * 자리가 둘로 갈린다: 상단 바는 폭이 좁아 아이콘 한 버튼(`ThemeCycleButton`)으로 돌려 고르고,
 * 넉넉한 모바일 드로어 발치에는 3버튼(`ThemeToggle`)을 그대로 쓴다. 둘은 같은 상태를 본다.
 *
 * 여기 shim을 두는 것은 이 앱의 다른 공유 컴포넌트(`badge`·`card`·`notice`·`markdown`)와
 * 같은 모양을 지키기 위해서다 — 화면은 `@/shared/ui`만 보고, 공유 패키지를 직접 부르는 것은
 * `shared/` 안의 이 파일들뿐이다.
 */
export { ThemeToggle, ThemeCycleButton } from "@ssccops/ui";
