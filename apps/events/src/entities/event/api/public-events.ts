import { ApiError, apiFetch, toQuery } from "@/shared/api/client";
import type {
  EventClassification,
  EventPhase,
  EventReceiptStatus,
  PublicEventDetail,
  PublicEventSummary,
} from "../model/types";

/*
 * 공개 행사 API (익명 호출 · 토큰 없음).
 *
 * 응답의 실제 모양을 아는 곳은 이 파일 하나다. 지금은 서버 필드명과 도메인 타입이 1:1이라
 * `to*` 변환기가 이름을 바꾸는 일을 하지 않지만, **없는 값을 만들어 내지 않는 자리**로 남겨
 * 둔다 — 빈 장소를 "-"로 채우는 것은 표기 규칙이고 그것은 그리는 쪽이 정한다.
 */

/** 화면이 분기에 쓰는 서버 오류 코드 */
export const EVENT_ERROR = {
  /** 없거나, 게시 상태가 아니라 공개되지 않는 행사 (작성 중·보관도 이 코드로 온다) */
  NOT_FOUND: "EVENT_NOT_FOUND",
} as const;

/**
 * 이 오류가 "그 행사는 공개되어 있지 않다"인가 — 상세 화면이 404 화면으로 넘길 때 쓴다.
 *
 * 코드와 상태를 함께 보는 것은, 서버 앞의 프록시가 핸들러까지 가지 못한 요청을 봉투 없이
 * 404로 끊는 경우가 있기 때문이다(그때는 코드가 CLIENT_UNKNOWN_ERROR로 온다).
 */
export function isEventNotFound(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.code === EVENT_ERROR.NOT_FOUND || error.status === 404)
  );
}

interface PublicEventSummaryResponse {
  eventId: number;
  eventClsfCd: string;
  eventClsfNm: string;
  eventTtl: string;
  thmbUrlAddr: string | null;
  eventPhase: EventPhase;
  receiptStatus: EventReceiptStatus | null;
  eventBgngDt: string | null;
  eventEndDt: string | null;
  plcNm: string | null;
}

interface PublicEventDetailResponse extends PublicEventSummaryResponse {
  mtxtCn: string;
  ptcpLmtCnt: number | null;
  confirmedCount: number;
}

function toSummary(response: PublicEventSummaryResponse): PublicEventSummary {
  return { ...response };
}

function toDetail(response: PublicEventDetailResponse): PublicEventDetail {
  return { ...response };
}

/**
 * 게시된 행사 목록. `eventClsfCd`를 넘기면 서버가 그 분류만 골라 준다.
 *
 * 페이징이 없는 계약이다 — 동아리 행사는 학기 단위라 전량을 한 번에 받아도 문제가 없고,
 * 서버가 페이징을 붙이면 그때 목록 화면이 함께 바뀐다.
 */
export async function fetchPublicEvents(
  eventClsfCd?: string | null,
): Promise<PublicEventSummary[]> {
  const events = await apiFetch<PublicEventSummaryResponse[]>(
    `/public/v1/events${toQuery({ eventClsfCd })}`,
  );
  return events.map(toSummary);
}

/** 게시된 행사 하나. 작성 중·보관 행사는 서버가 404 `EVENT_NOT_FOUND`로 답한다 */
export async function fetchPublicEvent(eventId: number): Promise<PublicEventDetail> {
  const event = await apiFetch<PublicEventDetailResponse>(`/public/v1/events/${eventId}`);
  return toDetail(event);
}

/**
 * 분류 필터 선택지를 목록에서 뽑아낸다.
 *
 * **공개 분류 목록 엔드포인트가 계약에 없다.** 어드민 쪽 `/v1/event-categories`는 관리 권한이
 * 필요하므로 여기서 부를 수 없고, 그래서 게시된 행사들이 실제로 쓰고 있는 분류만 칩으로 세운다.
 * 결과적으로 **행사가 하나도 없는 분류는 칩에도 나타나지 않는데**, 공개 화면에서는 그편이 낫다 —
 * 눌러도 빈 목록만 나오는 칩을 세울 이유가 없다.
 *
 * 정렬은 서버가 준 목록 순서를 그대로 따른다(먼저 나온 분류가 먼저 선다) — 웹이 이름순으로
 * 다시 정렬하면 운영진이 정한 표시 순번과 어긋난다.
 */
export function toClassifications(events: PublicEventSummary[]): EventClassification[] {
  const seen = new Map<string, EventClassification>();
  for (const event of events) {
    if (!seen.has(event.eventClsfCd)) {
      seen.set(event.eventClsfCd, {
        eventClsfCd: event.eventClsfCd,
        eventClsfNm: event.eventClsfNm,
      });
    }
  }
  return [...seen.values()];
}
