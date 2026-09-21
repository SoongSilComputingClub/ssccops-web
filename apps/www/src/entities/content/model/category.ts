import type { ContentCategoryCode } from "./types";

/*
 * 포스트 분류 — 코드 ↔ 주소 조각 ↔ 표시명 (#520).
 *
 * 서버 `ContentCategory`는 코드테이블이 아니라 고정 enum이라(ssccops-server#480) 행사 분류처럼
 * 목록에서 뽑지 않고 여기 표로 둔다. 주소에는 소문자 조각(`/records/academic`)을 쓰고
 * 서버에는 코드(`category=ACADEMIC`)를 보낸다 — 주소에 대문자 코드가 드러나면 개발 용어가
 * 사용자에게 나간다.
 */
export interface ContentCategory {
  code: ContentCategoryCode;
  /** 주소 조각 — `/records/{slug}` */
  slug: string;
  label: string;
}

/** 탭 순서 그대로 */
export const CONTENT_CATEGORIES: readonly ContentCategory[] = [
  { code: "ACADEMIC", slug: "academic", label: "학술" },
  { code: "EVENT", slug: "event", label: "행사" },
  { code: "NEWS", slug: "news", label: "뉴스" },
];

/** 주소 조각 → 분류. 표에 없는 조각이면 null(없는 주소) */
export function categoryBySlug(slug: string): ContentCategory | null {
  return CONTENT_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

/**
 * 코드 → 분류. 서버가 표에 없는 코드를 주면 null — 화면은 그 자리를 비운다(코드를 그대로
 * 표시명 자리에 쓰지 않는다).
 */
export function categoryByCode(code: string): ContentCategory | null {
  return CONTENT_CATEGORIES.find((category) => category.code === code) ?? null;
}
