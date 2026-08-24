/*
 * 클래스 이름 합치기 — 패키지 내부 전용(export 표면에 올리지 않는다).
 *
 * 두 앱에 각각 있는 `shared/lib/cn.ts`와 같은 세 줄이다. 여기서 앱 것을 가져다 쓰면
 * 패키지가 앱을 거꾸로 참조하게 되고, 앱 것을 이 패키지에서 다시 export 하면 폼과 무관한
 * 유틸이 폼 렌더러의 공개 계약이 된다 — 그 통합은 별개의 후속 이슈다.
 */
type ClassValue = string | number | null | undefined | false;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
