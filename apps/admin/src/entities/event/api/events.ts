import type { EventSttsCd } from "@/shared/config/codes";
import { apiFetch } from "@/shared/lib/api/client";
import { withServiceOffset } from "@/shared/lib/date";
import type {
  EventDetail,
  EventPhase,
  EventReceiptStatus,
  EventSummary,
} from "../model/types";

/*
 * 행사 API (ssccops#139 · #140 — 서버는 ssccops-server에서 병렬 구현 중).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** (entities/form/api/forms.ts와 같은
 * 판단). 계약이 합의는 됐지만 아직 머지 전이라 필드명이 흔들릴 수 있는데, 화면이 응답 객체를
 * 그대로 들고 다니면 그때마다 뷰 전체를 훑어야 한다. 서버 머지 후 실제 응답과 대조해 여기
 * `to*` 함수만 맞추면 된다.
 *
 * 관리 API 전체가 EVENT_MANAGE 권한이다(서버 판정) — 조회도 포함이라 메뉴 자체를 게이트한다.
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface EventSummaryResponse {
  eventId: number;
  eventClsfCd: string;
  eventClsfNm: string;
  eventTtl: string;
  eventSttsCd: EventSttsCd;
  /** 서버가 행사 일시로 파생한 진행 단계 (D9) */
  eventPhase: EventPhase | null;
  formId: number | null;
  /** 연결된 폼의 접수 상태 — 폼 미연결이면 null */
  receiptStatus: EventReceiptStatus | null;
  eventBgngDt: string | null;
  eventEndDt: string | null;
  plcNm: string | null;
  ptcpLmtCnt: number | null;
  confirmedCount: number | null;
  crtDt: string;
  mdfcnDt: string;
}

interface EventDetailResponse extends EventSummaryResponse {
  mtxtCn: string | null;
  thmbUrlAddr: string | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

function toEventSummary(res: EventSummaryResponse): EventSummary {
  return {
    eventId: res.eventId,
    eventClsfCd: res.eventClsfCd,
    eventClsfNm: res.eventClsfNm,
    eventTtl: res.eventTtl,
    eventSttsCd: res.eventSttsCd,
    /*
     * 파생값 하나가 비어 왔다고 목록 전체를 잃지 않는다(폼의 receiptStatus와 같은 판단).
     * 다만 일시를 보고 단계를 다시 계산할 수 있는 것은 서버뿐이므로 여기서는 "단계를 말할 수
     * 없다"(NONE)로만 떨어뜨린다 — 배지가 안 보일 뿐 카드가 죽지 않는다.
     */
    eventPhase: res.eventPhase ?? "NONE",
    formId: res.formId,
    receiptStatus: res.receiptStatus,
    eventBgngDt: res.eventBgngDt,
    eventEndDt: res.eventEndDt,
    plcNm: res.plcNm,
    ptcpLmtCnt: res.ptcpLmtCnt,
    confirmedCount: res.confirmedCount ?? 0,
    crtDt: res.crtDt,
    mdfcnDt: res.mdfcnDt,
  };
}

function toEventDetail(res: EventDetailResponse): EventDetail {
  return {
    ...toEventSummary(res),
    mtxtCn: res.mtxtCn ?? "",
    thmbUrlAddr: res.thmbUrlAddr,
  };
}

/* ── 오류 코드 ─────────────────────────────────────────────── */

/** 행사 API가 돌려주는 오류 코드 (서버와 합의된 계약) */
export const EVENT_ERROR = {
  /** 404 — 없는 행사 */
  EVENT_NOT_FOUND: "EVENT_NOT_FOUND",
  /** 404 — 없는 행사 분류 코드 (저장 본문의 eventClsfCd가 낡았다) */
  EVENT_CLASSIFICATION_NOT_FOUND: "EVENT_CLASSIFICATION_NOT_FOUND",
  /** 400 — 전이표에 없는 상태 전이. 화면이 들고 있는 상태가 서버와 어긋났다는 뜻이다 */
  INVALID_EVENT_STATUS_TRANSITION: "INVALID_EVENT_STATUS_TRANSITION",
  /** 409 — 신청이 발생한 뒤의 폼 연결 변경·해제 (D11) */
  EVENT_FORM_IN_USE: "EVENT_FORM_IN_USE",
  /** 409 — 이미 다른 행사에 전속 연결된 폼 (D11) */
  FORM_ALREADY_LINKED: "FORM_ALREADY_LINKED",
  /** 409 — 참가자가 있어 삭제할 수 없다 */
  EVENT_HAS_PARTICIPANT: "EVENT_HAS_PARTICIPANT",
  /** 413 — 본문 10만 자 상한 초과 */
  EVENT_CONTENT_TOO_LARGE: "EVENT_CONTENT_TOO_LARGE",
} as const;

/* ── 조회 ──────────────────────────────────────────────────── */

/** 행사 목록 필터 — 값이 없으면(null) 해당 축을 거르지 않는다. 둘 다 주면 AND다 */
export interface EventListFilter {
  eventClsfCd?: string | null;
  eventSttsCd?: EventSttsCd | null;
}

/**
 * GET /v1/events — 목록 (페이징 없음 · 페이지 봉투가 없어 apiFetch로 받는다).
 *
 * 분류·상태 필터를 쿼리로 보낸다 — 쿼리 파라미터 이름은 서버 계약(eventClsfCd·eventSttsCd)
 * 그대로다. URL 쿼리스트링과 요청이 1:1이 되게 화면도 같은 이름을 쓴다(폼 목록과 같은 판단).
 */
export async function fetchEvents(filter: EventListFilter = {}): Promise<EventSummary[]> {
  const query = new URLSearchParams();
  if (filter.eventClsfCd) query.set("eventClsfCd", filter.eventClsfCd);
  if (filter.eventSttsCd) query.set("eventSttsCd", filter.eventSttsCd);

  const qs = query.toString();
  const events = await apiFetch<EventSummaryResponse[] | null>(
    qs ? `/v1/events?${qs}` : "/v1/events",
  );
  return (events ?? []).map(toEventSummary);
}

/**
 * GET /v1/events/{eventId} — 단건 상세.
 *
 * 목록에서 find()로 고르지 않고 반드시 이 호출을 쓴다 — 목록 응답에는 본문(mtxtCn)이 없고,
 * URL로 바로 들어온 경우 목록 자체가 메모리에 없다. 없는 행사는 404 EVENT_NOT_FOUND로 온다.
 */
export async function fetchEvent(eventId: number): Promise<EventDetail> {
  const event = await apiFetch<EventDetailResponse>(`/v1/events/${eventId}`);
  return toEventDetail(event);
}

/* ── 저장 ──────────────────────────────────────────────────── */

/**
 * 행사 저장 입력 — 생성(POST)과 수정(PUT)이 같은 본문을 쓴다.
 *
 * **상태 필드가 없다.** 생성은 항상 DRAFT이고(D9) 게시·보관은 별도 상태 전이 API의 몫이다 —
 * 저장 한 번이 게시 상태를 덮어쓰는 사고를 계약 차원에서 막았다(폼 저장과 같은 판단).
 *
 * 선택 입력도 전부 싣는다 — 서버 수정은 전체 교체라 생략하면 지운 것으로 본다. 화면은 현재
 * 값을 전부 입력란에 채워 보여주고 부분 입력 폼을 만들지 않는다(AGENTS.md).
 */
export interface EventSaveInput {
  eventClsfCd: string;
  eventTtl: string;
  /** 본문 Markdown — 필수 */
  mtxtCn: string;
  thmbUrlAddr: string | null;
  /** 연결 폼 (D11 전속 연결). 해제·미연결은 null */
  formId: number | null;
  eventBgngDt: string | null;
  eventEndDt: string | null;
  plcNm: string | null;
  ptcpLmtCnt: number | null;
}

function toEventSaveBody(input: EventSaveInput) {
  return {
    eventClsfCd: input.eventClsfCd,
    eventTtl: input.eventTtl.trim(),
    mtxtCn: input.mtxtCn,
    thmbUrlAddr: input.thmbUrlAddr,
    formId: input.formId,
    /*
     * 값이 있으면 서비스 오프셋(+09:00)을 반드시 붙인다 — 서버 일시는 OffsetDateTime이라
     * datetime-local이 주는 오프셋 없는 값은 본문 파싱 단계에서 400으로 튕긴다
     * (근거는 shared/lib/date.ts의 withServiceOffset 주석 · 폼 저장과 같은 자리).
     */
    eventBgngDt: withServiceOffset(input.eventBgngDt),
    eventEndDt: withServiceOffset(input.eventEndDt),
    plcNm: input.plcNm,
    ptcpLmtCnt: input.ptcpLmtCnt,
  };
}

/** POST /v1/events — 신규 행사 생성 (201 · 항상 DRAFT). 응답 상세로 곧장 수정 화면에 간다 */
export async function createEvent(input: EventSaveInput): Promise<EventDetail> {
  const res = await apiFetch<EventDetailResponse>("/v1/events", {
    method: "POST",
    body: JSON.stringify(toEventSaveBody(input)),
  });
  return toEventDetail(res);
}

/**
 * PUT /v1/events/{eventId} — 수정 (전체 교체 · 상태 필드 없음).
 *
 * 폼 연결 변경·해제는 신청이 발생한 뒤에는 409 EVENT_FORM_IN_USE로, 다른 행사에 전속된 폼은
 * 409 FORM_ALREADY_LINKED로 거절된다 — 판정 근거는 서버다(화면이 들고 있는 목록은 낡을 수 있다).
 */
export async function updateEvent(
  eventId: number,
  input: EventSaveInput,
): Promise<EventDetail> {
  const res = await apiFetch<EventDetailResponse>(`/v1/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(toEventSaveBody(input)),
  });
  return toEventDetail(res);
}

/* ── 상태 전이 ─────────────────────────────────────────────── */

/**
 * 상태 전이 액션 (D9 — DRAFT ⇄ PUBLISHED → ARCHIVED ⇄ PUBLISHED).
 *
 * 다음 상태(eventSttsCd)가 아니라 **액션**을 보낸다 — 전이표를 웹이 들고 있으면 표가 바뀔 때
 * 서버와 따로 바뀌어 어긋난다(폼 상태 전이와 같은 판단). 어느 상태로 가는지는 서버가 정한다.
 */
export type EventStatusAction = "PUBLISH" | "RETRACT" | "ARCHIVE" | "REPUBLISH";

/**
 * POST /v1/events/{eventId}/status — 게시·게시 철회·보관·재공개.
 *
 * 전이 결과로 상세 전체가 온다 — 상태만이 아니라 파생 단계(eventPhase)까지 함께 바뀌므로
 * 화면은 이 응답으로 통째로 갈아 끼우거나 다시 조회한다(부분 갱신하지 않는다).
 * 전이표 밖이면 400 INVALID_EVENT_STATUS_TRANSITION — 화면이 낡았다는 뜻이라 다시 불러온다.
 */
export async function changeEventStatus(
  eventId: number,
  action: EventStatusAction,
): Promise<EventDetail> {
  const res = await apiFetch<EventDetailResponse>(`/v1/events/${eventId}/status`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
  return toEventDetail(res);
}

/* ── 삭제 ──────────────────────────────────────────────────── */

/**
 * DELETE /v1/events/{eventId} — 행사 삭제.
 *
 * 참가자가 있으면 409 EVENT_HAS_PARTICIPANT로 거절된다 — 그때의 안내(보관으로 전환)는
 * features/event의 오류 매핑이 맡는다. 화면이 참가자 수로 먼저 잠그지 않는 것은 확정 수가
 * 0이어도 대기자가 있을 수 있고, 판정 근거는 어차피 서버이기 때문이다.
 */
export async function deleteEvent(eventId: number): Promise<void> {
  await apiFetch<unknown>(`/v1/events/${eventId}`, { method: "DELETE" });
}
