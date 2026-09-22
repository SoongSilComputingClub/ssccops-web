/**
 * 기본 공유 카드(OG 이미지)의 허용 목록 (#602 · ssccops#444 — lms #556과 같은 뼈대).
 *
 * `GET /og?card=…`가 그릴 수 있는 카드는 **여기 적힌 것뿐**이다. 쿼리로 제목 문자열을 받아
 * 그리면 누구든 우리 마크 아래 아무 문장이나 얹은 그림을 만들어 돌릴 수 있다 — 동아리
 * 도메인이라 그 그림은 동아리가 말한 것으로 읽힌다. 라우트는 키만 받고 문구는 코드에서
 * 꺼낸다. 모르는 키는 기본 카드(오류를 내지 않는 것은 폼 카드가 없는 폼에 기본 카드를 주는
 * 것과 같은 자리 — 이미지 없는 카드보다 기본 카드가 낫다).
 *
 * 지금은 `default` 하나다 — 행사·포스트는 대표 이미지·표지가 있으면 그것을 쓰고(각 라우트의
 * `generateMetadata`), 공개 폼은 자기 라우트(`f/[formId]/og`)가 제목을 그린다. 축마다 카드를
 * 두고 싶으면 이 표에 한 줄 + 그 화면의 `openGraph.images`에 `ogImagePath("<키>")`.
 *
 * **시간에 따라 변하는 값(모집 기간·마감)은 넣지 않는다**(ssccops#194 · AGENTS «공유 카드»).
 */
export const OG_CARDS = {
  /** 사이트 기본 — 루트 레이아웃이 건다. 화면이 따로 이미지를 고르지 않으면 이것이 뜬다 */
  default: {
    /** 마크 옆 한 줄 — 제목이 동아리 이름이라 여기서 같은 글자를 되풀이하지 않는다 */
    header: "숭실대학교 중앙 컴퓨터 학술동아리",
    title: "SSCC 숭실컴퓨팅클럽",
    description: "소개와 모집, 세미나·프로젝트·스터디·행사 안내",
    footer: "숭실컴퓨팅클럽 공식 홈페이지",
  },
} as const;

export type OgCard = keyof typeof OG_CARDS;

export const DEFAULT_OG_CARD: OgCard = "default";

/** 라우트 핸들러 주소 — 쿼리 없이 열면 기본 카드 */
export const OG_ROUTE_PATH = "/og";

/** 카드 이미지 크기 — 카카오톡·페이스북이 큰 카드로 그리는 비율(1.91:1) */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** `card` 쿼리 값을 허용 목록의 키로 좁힌다 — 목록에 없으면(없음·오타·임의 문자열) 기본 카드 */
export function resolveOgCard(value: string | null | undefined): OgCard {
  return value !== null && value !== undefined && Object.hasOwn(OG_CARDS, value)
    ? (value as OgCard)
    : DEFAULT_OG_CARD;
}

/** 카드 이미지의 경로(오리진 없음) — 기본 카드는 쿼리를 붙이지 않는다. 절대 주소는 `metadataBase`가 */
export function ogImagePath(card: OgCard): string {
  return card === DEFAULT_OG_CARD ? OG_ROUTE_PATH : `${OG_ROUTE_PATH}?card=${card}`;
}
