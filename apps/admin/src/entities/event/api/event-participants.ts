import type { PtcpSttsCd } from "@/shared/config/codes";
import { apiFetch } from "@/shared/lib/api/client";
import type { EventParticipant } from "../model/types";

/*
 * 행사 참가자 명단 API (ssccops#145 · 서버 ssccops-server#158 — 병렬 구현 중).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다**(events.ts와 같은 판단). 계약은
 * 합의됐지만 아직 머지 전이라 필드명이 흔들릴 수 있다 — 서버 머지 후 실제 응답과 대조해
 * 아래 `to*` 함수만 맞추면 화면은 손대지 않는다.
 *
 * 전부 EVENT_MANAGE 권한이다 (D8 — 행사 경유 접근은 권한 하나로 통합한다).
 *
 * ── 신청(응답) 목록이 여기 없는 이유 ──────────────────────────
 * `GET /v1/events/{eventId}/applications`가 돌려주는 것은 참가자가 아니라 **폼 응답**이고,
 * 서버도 폼 응답 조회에 위임할 뿐이다. 그래서 그 호출은 응답 DTO를 이미 아는
 * `entities/response/api/responses.ts`에 뒀다 — 같은 응답의 모양을 두 파일이 각자 옮겨
 * 적으면 한쪽만 고쳐지는 날이 온다.
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface EventParticipantResponse {
  eventPtcpId: number;
  mbrId: number;
  mbrNm: string | null;
  stdntNo: string | null;
  ptcpSttsCd: PtcpSttsCd;
  /** 응답 기반 등록의 근거. 수동 등록이면 null */
  formRspnsId: number | null;
  /** 등록자 — 이름은 계약에 없다(서버가 조인하지 않는다) */
  rgtrMbrId: number;
  crtDt: string;
}

/**
 * 등록·전이 응답.
 *
 * 정원 초과는 **차단이 아니라 사실 통지**다(D5 — 정원은 참고치다). 그래서 성공 응답에
 * 확정 인원·정원·초과 여부가 함께 실려 오고, 화면은 등록을 마친 뒤 그것을 경고로 보여 준다.
 */
interface EventParticipantRegistrationResponse {
  participant: EventParticipantResponse;
  confirmedCount: number | null;
  ptcpLmtCnt: number | null;
  overCapacity: boolean | null;
  warnings: EventParticipantWarning[] | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

/**
 * 이름·학번이 비어 오는 경우의 방어.
 *
 * 계약상 서버가 mbr을 조인해 채우지만, 조인이 빠진 배포를 만났을 때 명단 전체가 하얗게
 * 죽는 대신 **그 행만 비어 보이게** 한다. 빈 값을 `"-"`로 메우지 않는 것은 표시 규칙이
 * 그리는 쪽의 몫이기 때문이다(AGENTS.md — 변환기가 채우면 "값이 없다"와 "서버가 -를 줬다"를
 * 구별할 수 없다).
 */
function toEventParticipant(res: EventParticipantResponse): EventParticipant {
  return {
    eventPtcpId: res.eventPtcpId,
    mbrId: res.mbrId,
    mbrNm: res.mbrNm ?? "",
    stdntNo: res.stdntNo ?? "",
    ptcpSttsCd: res.ptcpSttsCd,
    formRspnsId: res.formRspnsId,
    rgtrMbrId: res.rgtrMbrId,
    crtDt: res.crtDt,
  };
}

function toRegistration(
  res: EventParticipantRegistrationResponse,
): EventParticipantRegistration {
  const confirmedCount = res.confirmedCount ?? null;
  const ptcpLmtCnt = res.ptcpLmtCnt ?? null;

  return {
    participant: toEventParticipant(res.participant),
    confirmedCount,
    ptcpLmtCnt,
    /*
     * 초과 여부의 판정 근거는 서버다 — 값이 오면 그대로 쓴다. 필드가 비어 온 배포에서만
     * 두 수를 비교해 떨어뜨리는데, 이때도 정원이 없으면(null) 초과라는 개념 자체가 없다.
     */
    overCapacity:
      res.overCapacity ??
      (confirmedCount !== null && ptcpLmtCnt !== null && confirmedCount > ptcpLmtCnt),
    /* 서버가 warnings를 빠뜨렸어도 화면이 .map에서 터지지 않게 배열로 굳힌다 */
    warnings: res.warnings ?? [],
  };
}

/* ── 도메인 타입 ───────────────────────────────────────────── */

/**
 * 등록·전이에 붙는 경고 (서버 `MemberChangeWarningResponse`와 같은 모양).
 *
 * 탈퇴·제명 회원 등록처럼 **막지는 않되 알려야 하는** 사실이 온다. 화면은 `message`를 그대로
 * 보여 준다 — 코드를 모르는 경고가 새로 생겨도 삼키지 않기 위해서다(회원 상태 변경과 같은 판단).
 */
export interface EventParticipantWarning {
  code: string;
  message: string;
  count: number;
}

/** 등록·전이 결과 — 명단 한 줄 + 그 시점의 정원 현황 + 경고 */
export interface EventParticipantRegistration {
  participant: EventParticipant;
  /** 이 등록·전이가 끝난 뒤의 확정 인원. 서버가 세지 않았으면 null */
  confirmedCount: number | null;
  /** 행사 정원. 정원 없음이면 null */
  ptcpLmtCnt: number | null;
  /** 확정 인원이 정원을 넘었는가 — 넘어도 등록은 이미 끝났다(D5) */
  overCapacity: boolean;
  warnings: EventParticipantWarning[];
}

/**
 * 등록 입력 — **응답 기반**과 **수동**이 상호 배타다.
 *
 * 유니온으로 둔 것은 계약이 그렇기 때문이다(둘 다 싣거나 둘 다 빠지면 서버가 400). 한 객체에
 * 두 선택 필드를 두면 화면이 실수로 둘을 채운 채 보내는 경로가 열린다 — 타입으로 막는다.
 */
export type EventParticipantRegisterInput =
  | { formRspnsId: number; ptcpSttsCd: PtcpSttsCd }
  | { mbrId: number; ptcpSttsCd: PtcpSttsCd };

/* ── 오류 코드 ─────────────────────────────────────────────── */

/** 신청·참가자 API가 돌려주는 오류 코드 (서버 `EventErrorCode`와 합의된 계약) */
export const EVENT_PARTICIPANT_ERROR = {
  /**
   * 409 — 폼이 연결되지 않은 행사의 신청 목록을 물었다.
   *
   * 빈 배열이 아니라 오류인 것은 서버의 선택이다 — 빈 목록은 "아직 신청이 없다"로 읽히지만
   * 실제로는 신청을 받을 수단 자체가 없는 상태이고, 운영자가 해야 할 일이 전혀 다르다.
   */
  EVENT_HAS_NO_FORM: "EVENT_HAS_NO_FORM",
  /** 404 — 없는 참가자이거나 다른 행사의 참가자다(둘을 가르지 않는다) */
  EVENT_PARTICIPANT_NOT_FOUND: "EVENT_PARTICIPANT_NOT_FOUND",
  /** 409 — 같은 회원이 이 행사에 이미 올라 있다 */
  EVENT_PARTICIPANT_DUPLICATED: "EVENT_PARTICIPANT_DUPLICATED",
  /** 400 — 전이표(승격·취소) 밖. 화면이 낡았다는 뜻이다 */
  INVALID_PARTICIPANT_STATUS_TRANSITION: "INVALID_PARTICIPANT_STATUS_TRANSITION",
} as const;

/* ── 조회 ──────────────────────────────────────────────────── */

/**
 * GET /v1/events/{eventId}/participants — 참가자 명단 (페이징 없음).
 *
 * 상태 필터는 서버 쿼리로 나간다 — 화면에서 filter()로 거르면 취소된 참가자까지 늘 받아
 * 놓고 감추는 셈이라, 명단이 길어질수록 쓰지 않는 데이터를 실어 나른다.
 *
 * **정렬은 서버가 준 순서 그대로 쓴다**(등록순). 화면이 다시 정렬하면 '신청 순서 참고 표시'
 * (D5)가 서버가 아는 순서와 갈린다.
 */
export async function fetchEventParticipants(
  eventId: number,
  ptcpSttsCd: PtcpSttsCd | null = null,
): Promise<EventParticipant[]> {
  const qs = ptcpSttsCd ? `?ptcpSttsCd=${ptcpSttsCd}` : "";
  const participants = await apiFetch<EventParticipantResponse[] | null>(
    `/v1/events/${eventId}/participants${qs}`,
  );
  return (participants ?? []).map(toEventParticipant);
}

/* ── 등록 ──────────────────────────────────────────────────── */

/**
 * POST /v1/events/{eventId}/participants — 참가자 등록 (201).
 *
 * **등록자(rgtr_mbr_id)를 싣지 않는다.** 서버가 인증 주체에서 가져간다 — 화면이 적어 보내면
 * "누가 올렸는가"를 요청자가 스스로 정하는 것이라 명단이 증거가 되지 못한다(회원 등급·상태
 * 변경과 같은 판단). 본문에 자리를 만들지 않는 것이 그 경로를 막는 방법이다.
 *
 * 정원 초과는 거절 사유가 아니다(D5) — 성공 응답의 `overCapacity`로 온다.
 * 중복은 409 EVENT_PARTICIPANT_DUPLICATED, ACCEPTED가 아닌 응답으로 올리면 400/409다.
 */
export async function registerEventParticipant(
  eventId: number,
  input: EventParticipantRegisterInput,
): Promise<EventParticipantRegistration> {
  const res = await apiFetch<EventParticipantRegistrationResponse>(
    `/v1/events/${eventId}/participants`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return toRegistration(res);
}

/* ── 상태 전이 ─────────────────────────────────────────────── */

/**
 * PATCH /v1/events/{eventId}/participants/{eventPtcpId} — 승격·취소.
 *
 * 행사 상태 전이와 달리 **액션이 아니라 다음 상태를 보낸다** — 계약이 그렇다. 갈 수 있는
 * 곳이 상태마다 하나뿐이라(대기→확정 · 확정→취소) 액션 이름과 다음 상태가 1:1이고, 전이표
 * 자체는 서버(`EventParticipantEntity.changeStatus`)가 갖는다.
 *
 * 승격도 정원을 넘길 수 있으므로 등록과 같은 확정 인원·초과 여부가 실려 온다.
 * 전이표 밖이면 400 INVALID_PARTICIPANT_STATUS_TRANSITION — 화면이 낡았다는 뜻이다.
 *
 * **행을 지우는 DELETE는 계약에 없다**(D16 — 명단은 활동 이력으로 영구 보존한다).
 */
export async function changeEventParticipantStatus(
  eventId: number,
  eventPtcpId: number,
  ptcpSttsCd: PtcpSttsCd,
): Promise<EventParticipantRegistration> {
  const res = await apiFetch<EventParticipantRegistrationResponse>(
    `/v1/events/${eventId}/participants/${eventPtcpId}`,
    { method: "PATCH", body: JSON.stringify({ ptcpSttsCd }) },
  );
  return toRegistration(res);
}
