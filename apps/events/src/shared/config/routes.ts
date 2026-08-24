/** 전 화면 라우트 상수/빌더 — 경로 문자열을 화면에 직접 적지 않고 이 파일만 참조한다 */
export const ROUTES = {
  /** 행사 목록 — 공개 앱의 첫 화면이다 */
  events: "/",
  eventDetail: (eventId: number) => `/events/${eventId}`,
} as const;

/**
 * 분류 필터를 쿼리로 실은 목록 주소.
 *
 * 필터를 URL에 두는 것은 공유·뒤로 가기 때문이다 — 칩을 누른 상태 그대로 링크를 보낼 수 있고,
 * 상세를 봤다가 돌아와도 고르던 분류가 남는다. 값이 없으면 쿼리를 아예 붙이지 않는다
 * (`/?clsf=`처럼 빈 값이 남으면 '전체'가 두 가지 주소를 갖는다).
 */
export function eventsPath(eventClsfCd?: string | null): string {
  return eventClsfCd
    ? `${ROUTES.events}?${EVENT_CLSF_QUERY}=${encodeURIComponent(eventClsfCd)}`
    : ROUTES.events;
}

/** 목록의 분류 필터 쿼리 키 */
export const EVENT_CLSF_QUERY = "clsf";
