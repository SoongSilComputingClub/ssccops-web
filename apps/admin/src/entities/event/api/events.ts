import type { EventSttsCd } from "@/shared/config/codes";
import { apiFetch } from "@/shared/lib/api/client";
import { withServiceOffset } from "@/shared/lib/date";
import type {
  EventDetail,
  EventDuplicate,
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
  /*
   * 지운 일시 (ssccops-server#347 · `del_dt` · ADR-0020). 폼의 `delDt`와 같은 이름·같은 자리다 —
   * 살아 있는 행사에서는 언제나 `null`이고, 휴지통(`GET /v1/events/deleted`)에서만 값이 온다.
   *
   * 옵셔널인 것은 폼과 같은 이유다. 이 필드를 모르는 배포(#347 이전)에서는 통째로 빠지는데,
   * 그때는 `?? null`이 "지운 적 없음"으로 굳혀 화면이 삭제 표시를 그리지 않는다.
   */
  delDt?: string | null;
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
    delDt: res.delDt ?? null,
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
  /**
   * 409 — 이미 다른 행사에 전속 연결된 폼 (D11).
   *
   * **폼 연결에 남은 409는 이것 하나다.** 신청이 발생한 뒤의 연결 변경을 막던
   * `EVENT_FORM_IN_USE`는 서버가 걷었다(ssccops-server#336 · v0.2.4) — 이제 신청 뒤에도 연결을
   * 바꿀 수 있고, 무엇이 끊기는지는 저장 전 확인 시트가 알린다(ssccops-web#378).
   */
  FORM_ALREADY_LINKED: "FORM_ALREADY_LINKED",
  /** 413 — 본문 10만 자 상한 초과 */
  EVENT_CONTENT_TOO_LARGE: "EVENT_CONTENT_TOO_LARGE",
  /**
   * 502 — 복제 중 본문 이미지를 저장소에서 복사하지 못했다 (ssccops#198).
   *
   * **이때는 아무것도 만들어지지 않는다** — 서버가 한 트랜잭션으로 묶어 폼 사본까지 함께
   * 되돌린다. 화면은 "일부만 만들어졌을지 모른다"고 안내하지 않는다.
   */
  EVENT_IMAGE_COPY_FAILED: "EVENT_IMAGE_COPY_FAILED",
  /*
   * ── 소프트 삭제 (ADR-0020 · ssccops-server#347) ─────────────────
   *
   * **아래 세 문자열은 서버 PR과 같은 시점에 짓고 있어 아직 확정 전이다.** 서버가 다른 이름을
   * 쓰면 고칠 자리는 이 셋뿐이다 — 화면·훅·문구는 전부 이 상수로만 분기한다(폼이 `FORM_ERROR`를
   * 두고 한 판단과 같다). 짐작한 코드가 빗나가면 화면은 조용히 `default`로 떨어져 서버 문장을
   * 그대로 보여 주므로 고장이 아니라 문구가 덜 친절해지는 정도다.
   */
  /**
   * 409 — 학술 활동이 딸린 행사를 지우려 함.
   *
   * `acdm_actv.event_id`가 NOT NULL이라 행사가 사라지면 학술 프로그램이 고아가 된다. 학술 쪽에서
   * 프로그램을 정리한 뒤에야 지울 수 있다 — 화면은 이 거절을 **확인 시트 안에** 남긴다(토스트로
   * 날리면 왜 안 되는지 다시 볼 수 없다). 서버 이슈(#347)가 "`EVENT_HAS_ACADEMIC_PROGRAM` 같은
   * 이름"이라고 적어 그 이름을 그대로 잡았다.
   */
  EVENT_HAS_ACADEMIC_PROGRAM: "EVENT_HAS_ACADEMIC_PROGRAM",
  /**
   * 409 — 이미 지워진 행사를 또 지우려 함. 화면이 낡았다는 뜻이라(다른 탭에서 이미 지웠다)
   * 사과하지 않고 목록을 다시 부른다.
   *
   * 문자열이 `EVENT_` 접두 없이 `"ALREADY_DELETED"`인 것은 운영(서버 #125)·폼(서버 #329) 두
   * 도메인이 같은 상황에 이 문자열을 쓰고 있고, 서버 #347이 폼 형판을 그대로 따르기 때문이다.
   */
  EVENT_ALREADY_DELETED: "ALREADY_DELETED",
  /** 409 — 지워지지 않은 행사를 되살리려 함. `ALREADY_DELETED`의 짝이며 같은 처리를 받는다 */
  EVENT_NOT_DELETED: "NOT_DELETED",
} as const;

/* ── 조회 ──────────────────────────────────────────────────── */

/** 행사 목록 필터 — 값이 없으면(null) 해당 축을 거르지 않는다. 둘 다 주면 AND다 */
export interface EventListFilter {
  eventClsfCd?: string | null;
  eventSttsCd?: EventSttsCd | null;
  /**
   * 지운 행사만 본다 (ADR-0020 · ssccops-server#347).
   *
   * 분류·상태와 달리 같은 집합을 좁히는 조건이 아니라 **다른 모집단으로 갈아타는 스위치**다 —
   * 그래서 `null`(거르지 않음)이 없고, 쿼리 파라미터가 아니라 **경로를 고른다**(폼의
   * `FormListFilter.deleted`와 같은 판단 · 근거는 그쪽 주석). 켜면 분류·상태는 보내지 않는다.
   */
  deleted?: boolean;
}

/**
 * GET /v1/events — 목록 (페이징 없음 · 페이지 봉투가 없어 apiFetch로 받는다).
 * **지운 행사는 GET /v1/events/deleted로 나간다.**
 *
 * 분류·상태 필터를 쿼리로 보낸다 — 쿼리 파라미터 이름은 서버 계약(eventClsfCd·eventSttsCd)
 * 그대로다. URL 쿼리스트링과 요청이 1:1이 되게 화면도 같은 이름을 쓴다(폼 목록과 같은 판단).
 */
export async function fetchEvents(filter: EventListFilter = {}): Promise<EventSummary[]> {
  /*
   * 휴지통은 같은 목록의 조건이 아니라 **별도 자원**이다. `?deleted=true`로 보내지 않는 것은
   * 폼이 실제로 겪은 일 때문이다(ssccops-web#362) — 스프링은 모르는 쿼리 파라미터를 조용히
   * 무시하므로 그 호출은 오류가 아니라 **살아 있는 행사 목록을 200으로** 돌려준다. 경로를 고르는
   * 자리를 응답을 아는 이 파일 하나로 둔다. 정렬은 지운 시각 역순으로 서버가 정한다.
   */
  if (filter.deleted) return fetchDeletedEvents();

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
 * 폼 연결은 신청이 발생한 뒤에도 바꾸거나 해제할 수 있다 — 서버가 그 가드를 걷었고
 * (ssccops-server#336), 대신 무엇이 끊기는지를 저장 전 확인 시트가 알린다(ssccops-web#378).
 * 다른 행사에 전속된 폼은 409 FORM_ALREADY_LINKED로 거절된다 — 판정 근거는 서버다(화면이
 * 들고 있는 목록은 낡을 수 있다).
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

/* ── 복제 ──────────────────────────────────────────────────── */

interface EventDuplicateResponse {
  eventId: number;
  sourceEventId: number;
  eventTtl: string;
  eventSttsCd: EventSttsCd;
  formId: number | null;
  crtDt: string;
}

/**
 * POST /v1/events/{eventId}/duplicate — 행사 복제 (ssccops#198 · 201).
 *
 * **승계/초기화는 전부 서버가 정한다** — 제목 `(복사본)` · `DRAFT` · 기간 비움 · 참가자
 * 미승계 · 연결 폼도 함께 복제해 사본 연결 · 본문 이미지를 사본의 키로 복사. 화면은 부르고
 * 이동하기만 한다: 그 규칙을 여기서 다시 계산하면 두 벌이 되고, 무엇보다 이미지 복사와 폼
 * 복제는 웹이 할 수 있는 일이 아니다.
 *
 * 응답은 상세 전체가 아니라 **사본이 무엇인지 알려 주는 값**뿐이다(폼 복제와 같은 계약) —
 * 사본은 늘 기간이 비어 있고 참가자가 0이라, 그 값들을 실어 주면 "승계되는 경우도 있나"
 * 하는 의문만 만든다. 화면은 이 eventId로 수정 화면에 간다.
 */
export async function duplicateEvent(eventId: number): Promise<EventDuplicate> {
  const res = await apiFetch<EventDuplicateResponse>(`/v1/events/${eventId}/duplicate`, {
    method: "POST",
  });
  return {
    eventId: res.eventId,
    sourceEventId: res.sourceEventId,
    eventTtl: res.eventTtl,
    eventSttsCd: res.eventSttsCd,
    formId: res.formId,
    crtDt: res.crtDt,
  };
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
 * GET /v1/events/deleted — 지운 행사 목록 (ADR-0020 · ssccops-server#347 · EVENT_MANAGE).
 *
 * 목록 항목과 같은 모양에 `delDt`가 채워져 온다. 분류·상태 필터를 받지 않는다 — 지운 행사는
 * 치우려고 지운 것이라 좁혀 볼 일이 없고, 할 수 있는 일도 되살리기 하나다.
 */
export async function fetchDeletedEvents(): Promise<EventSummary[]> {
  const events = await apiFetch<EventSummaryResponse[] | null>("/v1/events/deleted");
  return (events ?? []).map(toEventSummary);
}

/**
 * DELETE /v1/events/{eventId} — 소프트 삭제 (ADR-0020 · ssccops-server#347 · EVENT_MANAGE).
 *
 * **ADR-0014가 걷어냈던 경로가 되살아난 것이다 — 이번에는 소프트다.** 보관과 뜻이 다르다:
 * 보관은 끝난 행사를 공개에서 내리되 운영 기록으로 남기는 것이고, 삭제는 잘못 만든 것을
 * 목록에서 치우되 되돌릴 수 있게 두는 것이다. 지울 수 있는 상태는 전부다(DRAFT·PUBLISHED·
 * ARCHIVED) — 게시 중인 행사를 지우면 공개에서도 사라진다.
 *
 * **참가자가 있는 행사도 지운다.** 데이터(event_ptcp·응답)는 남고, 참가자의 «내 신청»에서 그
 * 항목이 사라진다 — 되돌릴 수 있다는 것이 그 대가를 감당 가능하게 만드는 유일한 조건이라, 이
 * 함수는 `restoreEvent`와 **반드시 같은 화면에서** 쓰인다(폼 `deleteForm`과 같은 판단).
 * R2 이미지는 지우지 않는다 — 복구하면 그대로 붙는다.
 *
 * 학술 활동이 딸린 행사는 409 `EVENT_HAS_ACADEMIC_PROGRAM`으로 거절된다 — 화면이 미리 잠글
 * 근거(목록에 학술 연결 여부)가 없어 거절이 유일한 방어선이다. 이미 지워진 행사는 409
 * `ALREADY_DELETED`, 없는 행사는 404 `EVENT_NOT_FOUND`다.
 */
export async function deleteEvent(eventId: number): Promise<void> {
  await apiFetch<void>(`/v1/events/${eventId}`, { method: "DELETE" });
}

/**
 * POST /v1/events/{eventId}/restore — 지운 행사 되살리기 (ADR-0020 · ssccops-server#347).
 *
 * 권한은 지우기와 같은 `EVENT_MANAGE`다 — 지울 수 있는 사람이 되돌릴 수 없으면 자기가 저지른
 * 것을 스스로 수습하지 못한다. `POST .../restore` 모양은 상태 전이(`.../status`)·복제
 * (`.../duplicate`)와 같은 이 도메인의 관례이고 폼 복구와도 같다.
 *
 * 복구는 **지우기 전 상태를 그대로 되돌린다** — 게시 상태도 참가자도 연결 폼도 그대로다(복제와
 * 다르다). 돌려받을 값이 없어 반환이 없다: 화면은 목록을 다시 부른다.
 * 지워지지 않은 행사는 409 `NOT_DELETED`, 없는 행사는 404 `EVENT_NOT_FOUND`다.
 */
export async function restoreEvent(eventId: number): Promise<void> {
  await apiFetch<void>(`/v1/events/${eventId}/restore`, { method: "POST" });
}
