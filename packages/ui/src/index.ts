/*
 * @ssccops/ui — 세 앱이 함께 쓰는 표시 요소.
 *
 * ── 여기 있는 것 ────────────────────────────────────────────
 * **둘 이상의 앱이 실제로 같은 것을 쓰고 있던 것만** 올렸다(ssccops#243). 앱 하나만 쓰는
 * 컴포넌트는 그 앱에 둔다 — 전부 올리면 이 패키지가 세 앱의 합집합이 되어 아무도 못 건드린다.
 *
 * ── 여기 없는 것과 그 이유 ──────────────────────────────────
 * | | |
 * |---|---|
 * | `Chip` | 이름만 같고 다른 컴포넌트다. admin은 필터 칩, www·lms는 선택 칩 |
 * | `EmptyState` | API가 다르다. admin은 `message`+`action`, www·lms는 `title`+`description` |
 * | `Button`·`GridTable`·`Calendar` 등 | admin에만 있다 — 중복이 아니다 |
 * | `Notice` | www·lms에만 있다. 올릴 수 있지만 이번 범위는 상위 이슈가 지목한 것까지다 |
 *
 * ── 색을 토큰으로 적는다 ────────────────────────────────────
 * `var(--color-line)`처럼 쓰고 값(`#e5e8eb`)으로 박지 않는다. 세 앱의 `@theme`이 같은 이름을
 * 정의하고 있어 지금은 결과가 같지만, 다크모드를 켜는 앱이 생기면(ssccops#226이 admin에 했다)
 * 값으로 박힌 쪽만 밝은 채로 남는다.
 */

export { cn } from "./lib/cn";
export { Badge, Pill, type BadgeTone } from "./ui/badge";
export { Card, CardTitle, SectionLabel } from "./ui/card";
export { Markdown } from "./ui/markdown";
export { TextField, Field } from "./ui/field";
