import type {
  AgndPrcsSeCd,
  AtndTrgtCd,
  MtgSeCd,
  MtgSttsCd,
  OperTypeCd,
  PrrtyRnkCd,
} from "@/shared/config/codes";
import { ApiError, apiFetch } from "@/shared/lib/api/client";
import { withServiceOffset } from "@/shared/lib/date";
import type {
  MeetingAgenda,
  MeetingAgendaTarget,
  MeetingDetail,
  MeetingListItem,
  MeetingMemberRef,
  MeetingTransition,
} from "../model/types";

/*
 * 회의 API (ssccops-server OPS-024 등록 · OPS-025 상세 · OPS-026 전이 · OPS-027~029 안건 ·
 * OPS-031 목록, #83 · ssccops-web#56).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — entities/work/api/works.ts가
 * 잡아 둔 규칙 그대로다. 화면이 응답 객체를 그대로 들고 다니면 계약이 바뀔 때마다 뷰 전체를
 * 훑어야 한다.
 *
 * 전 엔드포인트에 MEETING_MANAGE 권한이 걸려 있다 (서버 #9 · MeetingController 클래스
 * 애노테이션). 조회도 함께 막힌다 — 안건에는 내부 논의 내용이 그대로 들어 있다.
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface MemberSummaryResponse {
  memberId: number | null;
  name: string | null;
}

interface AgendaTargetOperationResponse {
  operationId: number;
  operationType: OperTypeCd;
  title: string | null;
}

interface MeetingAgendaResponse {
  agendaId: number;
  meetingId: number;
  agendaName: string | null;
  processStatus: AgndPrcsSeCd | null;
  agendaOrder: number | null;
  targetOperation: AgendaTargetOperationResponse | null;
  content: string | null;
  resultContent: string | null;
  submitter: MemberSummaryResponse | null;
}

interface MeetingListItemResponse {
  meetingId: number;
  operationId: number;
  title: string | null;
  meetingCategory: MtgSeCd | null;
  meetingStatus: MtgSttsCd | null;
  attendeeScope: AtndTrgtCd | null;
  personInCharge: MemberSummaryResponse | null;
  location: string | null;
  agendaCount: number | null;
  startAt: string | null;
  endAt: string | null;
  createdAt: string | null;
}

interface MeetingDetailResponse {
  meetingId: number;
  operationId: number;
  operationType: OperTypeCd;
  title: string | null;
  meetingCategory: MtgSeCd | null;
  meetingStatus: MtgSttsCd | null;
  attendeeScope: AtndTrgtCd | null;
  personInCharge: MemberSummaryResponse | null;
  registrant: MemberSummaryResponse | null;
  startAt: string | null;
  endAt: string | null;
  priority: PrrtyRnkCd;
  location: string | null;
  internalDetail: string | null;
  externalSummary: string | null;
  agendas: MeetingAgendaResponse[] | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface MeetingTransitionResponse {
  meetingId: number;
  transition: MeetingTransition;
  previousMeetingStatus: MtgSttsCd;
  meetingStatus: MtgSttsCd;
  changedAt: string;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

/** 담당자·등록자·제출자 요약. 값이 없으면(이관 데이터 등) null로 떨어뜨린다 */
function toMemberRef(member: MemberSummaryResponse | null): MeetingMemberRef | null {
  if (!member || member.memberId == null) return null;
  return { memberId: member.memberId, name: member.name ?? "" };
}

function toAgendaTarget(
  target: AgendaTargetOperationResponse | null,
): MeetingAgendaTarget | null {
  if (!target) return null;
  return { operationId: target.operationId, operationType: target.operationType, title: target.title ?? "" };
}

function toAgenda(res: MeetingAgendaResponse): MeetingAgenda {
  return {
    agendaId: res.agendaId,
    meetingId: res.meetingId,
    agendaName: res.agendaName,
    processStatus: res.processStatus,
    agendaOrder: res.agendaOrder,
    targetOperation: toAgendaTarget(res.targetOperation),
    content: res.content,
    resultContent: res.resultContent,
    submitter: toMemberRef(res.submitter),
  };
}

function toMeetingListItem(res: MeetingListItemResponse): MeetingListItem {
  return {
    meetingId: res.meetingId,
    operationId: res.operationId,
    title: res.title ?? "",
    meetingCategory: res.meetingCategory,
    meetingStatus: res.meetingStatus,
    attendeeScope: res.attendeeScope,
    personInCharge: toMemberRef(res.personInCharge),
    location: res.location,
    agendaCount: res.agendaCount ?? 0,
    startAt: res.startAt,
    endAt: res.endAt,
    createdAt: res.createdAt,
  };
}

function toMeetingDetail(res: MeetingDetailResponse): MeetingDetail {
  return {
    meetingId: res.meetingId,
    operationId: res.operationId,
    operationType: res.operationType,
    title: res.title ?? "",
    meetingCategory: res.meetingCategory,
    meetingStatus: res.meetingStatus,
    attendeeScope: res.attendeeScope,
    personInCharge: toMemberRef(res.personInCharge),
    registrant: toMemberRef(res.registrant),
    startAt: res.startAt,
    endAt: res.endAt,
    priority: res.priority,
    location: res.location,
    internalDetail: res.internalDetail,
    externalSummary: res.externalSummary,
    agendas: (res.agendas ?? []).map(toAgenda),
    createdAt: res.createdAt,
    updatedAt: res.updatedAt,
  };
}

/* ── 오류 코드 ─────────────────────────────────────────────── */

/**
 * 회의 API가 돌려주는 오류 코드 (ssccops-server OperationErrorCode).
 *
 * **enum 이름이 아니라 본문에 실리는 코드 문자열이다.** entities/work/api/works.ts의 같은
 * 주석 참고 — enum 이름을 적어 두면 어느 화면도 못 알아본다.
 */
export const MEETING_ERROR = {
  /** 없는 회의 · 없는 안건 (404) */
  NOT_FOUND: "NOT_FOUND",
  /** 필수값 누락·형식 오류·담당자 부적격·기간 역전·안건 연결 규칙 위반 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 기준 코드에 없는 값 (400) */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
  /** MEETING_MANAGE 권한 없음 · 의장이 아닌 회원의 개회·회의록작성·종료 시도 (403) */
  FORBIDDEN: "FORBIDDEN",
  /** 전이표에 없는 상태 전환 · 시작 전이 아닌 회의의 안건 상정 철회 (409) */
  TRANSITION_NOT_ALLOWED: "TRANSITION_NOT_ALLOWED",
  /** 미처리 안건이 남은 채 회의 종료 시도 (409) */
  AGENDA_UNRESOLVED: "AGENDA_UNRESOLVED",
  /** 종료·취소된 회의에 안건 상정·수정 시도 (409) */
  MEETING_CLOSED: "MEETING_CLOSED",
  /** 취소 사유 누락 (422) */
  REASON_REQUIRED: "REASON_REQUIRED",
  /** 이미 소프트 삭제된 회의를 다시 삭제 시도 (409, 서버 #125) */
  ALREADY_DELETED: "ALREADY_DELETED",
} as const;

/* ── 목록 ──────────────────────────────────────────────────── */

/**
 * GET /v1/meetings — 카드 목록 (OPS-031).
 *
 * 커서 페이징이 없다 — '회의' 화면이 카드 그리드 하나로 페이징 없이 전량을 보여준다(서버가
 * page 봉투를 싣지 않는다). `apiFetchList`가 아니라 `apiFetch`를 쓰는 이유는
 * entities/sub-work-type/api/sub-work-types.ts의 같은 판단 참고.
 */
export async function fetchMeetings(): Promise<MeetingListItem[]> {
  const meetings = await apiFetch<MeetingListItemResponse[] | null>("/v1/meetings");
  return (meetings ?? []).map(toMeetingListItem);
}

/* ── 상세 ──────────────────────────────────────────────────── */

/**
 * GET /v1/meetings/{meetingId} — 상세 (OPS-025).
 *
 * 목록에서 find()로 고르지 않고 반드시 이 호출을 쓴다 — 목록 응답에는 안건 목록도 내부·
 * 외부 회의 상세도 없고, URL로 바로 들어온 경우 목록 자체가 메모리에 없다.
 * 없는 회의는 404 `NOT_FOUND`다.
 */
export async function fetchMeeting(meetingId: number): Promise<MeetingDetail> {
  const meeting = await apiFetch<MeetingDetailResponse>(`/v1/meetings/${meetingId}`);
  return toMeetingDetail(meeting);
}

/* ── 등록 ──────────────────────────────────────────────────── */

/** 등록·상정 시 함께 보내는 안건 한 건 (OPS-024 agendas[] · OPS-027) */
export interface MeetingAgendaInput {
  /** 연결할 운영 건. agendaName과 상호 배타적이다 — 둘 중 하나만 채운다 */
  targetOperationId: number | null;
  /** 독립 안건 제목. targetOperationId와 상호 배타적이다 */
  agendaName: string | null;
  processStatus: AgndPrcsSeCd | null;
  content: string | null;
}

/**
 * 회의 등록 입력 (OPS-024).
 *
 * 화면에 있는 값 중 여기 없는 것이 있다 — 회의_상태·등록자·등록일시는 **서버가 정한다.**
 * 상태는 항상 예정(SCHEDULED)으로 고정되고 등록자는 인증 주체에서 온다.
 *
 * **회의 책임자를 따로 받지 않는다** — `personInChargeId`(담당자)와 항상 같은 회원이라
 * 서버가 oper.pic_id·mtg.mtg_rbprsn_id 양쪽에 같은 값을 채운다(이슈 본문 — 좌측 담당자를
 * 책임자로 쓰고 우측 책임자 필드는 입력받지 않는다).
 */
export interface MeetingCreateInput {
  title: string;
  meetingCategory: MtgSeCd;
  personInChargeId: number;
  startAt: string | null;
  endAt: string | null;
  /** 생략하면 서버가 NORMAL로 저장한다 */
  priority: PrrtyRnkCd;
  attendeeScope: AtndTrgtCd | null;
  location: string | null;
  /** 함께 등록할 안건 목록. 비어 있으면 안건 없는 회의로 등록된다 */
  agendas: MeetingAgendaInput[];
}

function toAgendaRequestBody(input: MeetingAgendaInput) {
  return {
    targetOperationId: input.targetOperationId,
    agendaName: input.agendaName?.trim() || null,
    processStatus: input.processStatus,
    content: input.content?.trim() || null,
  };
}

/**
 * POST /v1/meetings — 회의 등록 (OPS-024).
 *
 * 일시에는 **오프셋을 반드시 붙인다** — entities/work/api/works.ts의 createWork와 같은 이유
 * (withServiceOffset 주석).
 *
 * 응답이 상세 조회와 같은 MeetingDetail이라 등록 직후 재조회 없이 방금 등록한 회의(와 함께
 * 등록한 안건까지)를 그대로 그릴 수 있다.
 */
export async function createMeeting(input: MeetingCreateInput): Promise<MeetingDetail> {
  const res = await apiFetch<MeetingDetailResponse | null>("/v1/meetings", {
    method: "POST",
    body: JSON.stringify({
      title: input.title.trim(),
      meetingCategory: input.meetingCategory,
      personInChargeId: input.personInChargeId,
      startAt: withServiceOffset(input.startAt),
      endAt: withServiceOffset(input.endAt),
      priority: input.priority,
      attendeeScope: input.attendeeScope,
      location: input.location?.trim() || null,
      agendas: input.agendas.map(toAgendaRequestBody),
    }),
  });

  if (!res?.meetingId) {
    throw new ApiError(
      MEETING_ERROR.VALIDATION_FAILED,
      "회의는 등록됐지만 서버가 회의_ID를 돌려주지 않았습니다. 목록에서 확인해주세요",
    );
  }

  return toMeetingDetail(res);
}

/* ── 상태 전이 ─────────────────────────────────────────────── */

/** 회의 상태 전이 결과 (OPS-026 TransitionResult) */
export interface MeetingTransitionResult {
  meetingId: number;
  transition: MeetingTransition;
  previousMeetingStatus: MtgSttsCd;
  meetingStatus: MtgSttsCd;
  changedAt: string;
}

/**
 * POST /v1/meetings/{meetingId}/transitions — 회의 상태 전이 (OPS-026).
 *
 * 개회(OPEN)·회의록작성(WRITE_MINUTES)·종료(CLOSE)는 회의 책임자 본인만 할 수 있다 —
 * 그 밖의 회원이 부르면 403 FORBIDDEN이다. 취소(CANCEL)만 예외라 MEETING_MANAGE 권한만
 * 있으면 된다. reason은 취소에서만 필수다(누락 시 422 REASON_REQUIRED).
 */
export async function transitionMeeting(
  meetingId: number,
  transition: MeetingTransition,
  reason: string | null = null,
): Promise<MeetingTransitionResult> {
  return apiFetch<MeetingTransitionResponse>(`/v1/meetings/${meetingId}/transitions`, {
    method: "POST",
    body: JSON.stringify({ transition, reason: reason?.trim() || null }),
  });
}

/* ── 안건 ──────────────────────────────────────────────────── */

/**
 * POST /v1/meetings/{meetingId}/agendas — 안건 상정 (OPS-027).
 *
 * 종료·취소된 회의는 409 MEETING_CLOSED다. 제출자는 요청에 없다 — 인증 주체로 서버가
 * 고정한다(다른 등록자류 필드와 같은 규칙).
 */
export async function addMeetingAgenda(
  meetingId: number,
  input: MeetingAgendaInput,
): Promise<MeetingAgenda> {
  const res = await apiFetch<MeetingAgendaResponse>(`/v1/meetings/${meetingId}/agendas`, {
    method: "POST",
    body: JSON.stringify(toAgendaRequestBody(input)),
  });
  return toAgenda(res);
}

/** 안건 수정 입력 (OPS-028). 연결 운영 건·제목·제출자는 이 API로 바꿀 수 없다 */
export interface MeetingAgendaUpdateInput {
  content: string | null;
  resultContent: string | null;
  processStatus: AgndPrcsSeCd;
}

/**
 * PATCH /v1/meetings/{meetingId}/agendas/{agendaId} — 안건 수정 (OPS-028).
 *
 * **전체 교체다** — content·resultContent를 생략하면 서버가 지운 것으로 본다
 * (entities/work의 updateWork와 같은 규칙).
 */
export async function updateMeetingAgenda(
  meetingId: number,
  agendaId: number,
  input: MeetingAgendaUpdateInput,
): Promise<MeetingAgenda> {
  const res = await apiFetch<MeetingAgendaResponse>(
    `/v1/meetings/${meetingId}/agendas/${agendaId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        content: input.content?.trim() || null,
        resultContent: input.resultContent?.trim() || null,
        processStatus: input.processStatus,
      }),
    },
  );
  return toAgenda(res);
}

/**
 * DELETE /v1/meetings/{meetingId}/agendas/{agendaId} — 안건 상정 철회 (OPS-029).
 *
 * 회의 시작 전(SCHEDULED)만 허용한다 — 그 밖은 409 TRANSITION_NOT_ALLOWED다.
 */
export async function withdrawMeetingAgenda(
  meetingId: number,
  agendaId: number,
): Promise<void> {
  await apiFetch<void>(`/v1/meetings/${meetingId}/agendas/${agendaId}`, {
    method: "DELETE",
  });
}

/* ── 삭제 ──────────────────────────────────────────────────── */

/**
 * DELETE /v1/meetings/{meetingId} — 소프트 삭제 (서버 #125).
 *
 * 자기 자신만 삭제한다 — 안건(mtg_dtl)은 지우지 않고 그대로 둔다(부모가 삭제되면 조회
 * 경로가 막혀 도달 불가능해질 뿐이다). 상태(종료·취소 포함)와 무관하게 항상 허용되고,
 * 회의 책임자(의장) 본인 여부도 보지 않는다 — MEETING_DELETE 보유 여부만으로 판정한다
 * (entities/session의 CAPABILITY.MEETING_DELETE 주석 참고). 이미 삭제된 건은 409
 * ALREADY_DELETED, 대상이 아예 없으면 기존 404 NOT_FOUND다.
 */
export async function deleteMeeting(meetingId: number): Promise<void> {
  await apiFetch<void>(`/v1/meetings/${meetingId}`, { method: "DELETE" });
}
