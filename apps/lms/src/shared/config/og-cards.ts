/**
 * 공유 카드(OG 이미지)의 허용 목록 (#556 · ssccops#418).
 *
 * `GET /og?card=…`가 그릴 수 있는 카드는 **여기 적힌 것뿐**이다. 쿼리로 제목 문자열을 받아
 * 그리면 누구든 우리 마크 아래 아무 문장이나 얹은 그림을 만들어 돌릴 수 있다 — 도메인이
 * `lms.…sscc-ssu.com`이라 그 그림은 동아리가 말한 것으로 읽힌다. 그래서 라우트는 키만 받고
 * 문구는 코드에서 꺼낸다. 모르는 키는 기본 카드로 떨어진다(오류를 내지 않는 것은 www 폼 카드가
 * 없는 폼에 기본 카드를 주는 것과 같은 자리 — 이미지 없는 카드보다 기본 카드가 낫다).
 *
 * **시간에 따라 변하는 값(접수 기간·마감)은 넣지 않는다**(ssccops#194). 메신저는 이미지를 한 번
 * 캐싱하면 갱신하지 않아, 담으면 마감 뒤에도 «접수 중»이라 말하는 그림이 방에 남는다.
 *
 * 새 카드를 더할 때는 이 표에 한 줄 더하고, 그 화면의 `metadata`에서 `ogImageUrl("<키>")`를
 * 쓴다(`shared/lib/og-image-url.ts`).
 */
export const OG_CARDS = {
  /** 앱 기본 — 루트 레이아웃이 건다. 화면이 따로 카드를 고르지 않으면 이것이 뜬다 */
  default: {
    title: "SSCC 학술",
    description: "스터디·프로젝트 활동과 회차·출석, 기획안 제출",
    footer: "숭실컴퓨팅클럽 학술 · 부원 로그인 후 이용합니다",
  },
  /** 기획안 제출(`/proposals/new`) — 학기 초마다 부원 전체에게 뿌리는 링크 */
  proposal: {
    title: "기획안 제출",
    description: "스터디·프로젝트 기획안을 내고 학술국 검토를 받습니다",
    footer: "기획안 · 로그인하면 바로 작성할 수 있습니다",
  },
} as const;

export type OgCard = keyof typeof OG_CARDS;

export const DEFAULT_OG_CARD: OgCard = "default";

/** 라우트 핸들러 주소 — 쿼리 없이 열면 기본 카드 */
export const OG_ROUTE_PATH = "/og";

/** `card` 쿼리 값을 허용 목록의 키로 좁힌다 — 목록에 없으면(없음·오타·임의 문자열) 기본 카드 */
export function resolveOgCard(value: string | null | undefined): OgCard {
  return value !== null && value !== undefined && Object.hasOwn(OG_CARDS, value)
    ? (value as OgCard)
    : DEFAULT_OG_CARD;
}

/** 카드 이미지의 경로(오리진 없음) — 기본 카드는 쿼리를 붙이지 않는다 */
export function ogImagePath(card: OgCard): string {
  return card === DEFAULT_OG_CARD ? OG_ROUTE_PATH : `${OG_ROUTE_PATH}?card=${card}`;
}
