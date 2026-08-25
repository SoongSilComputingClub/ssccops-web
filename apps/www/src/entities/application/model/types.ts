/*
 * 내 신청 도메인 타입 (SoongSilComputingClub/ssccops#145 — wave2 D10).
 *
 * 서버 API는 병렬 구현 중이라 아직 없다 — 여기 타입은 합의된 계약을 그대로 옮긴 것이다.
 * 응답의 실제 모양을 아는 곳은 `entities/application/api` 하나이고 화면은 이 타입만 본다.
 */

/**
 * 신청 상태.
 *
 * 서버가 **참가자 상태와 응답 상태를 이미 하나로 합쳐** 내려준다 — 참가자 행이 있으면 그쪽이
 * 우선이고 없으면 응답 상태다. 그 판정을 웹이 다시 하지 않는다(규칙이 두 벌이 되면 어긋난다).
 *
 * `DRAFT`(작성 중)는 계약상 내려오지 않는다 — 제출하지 않은 것은 신청이 아니다.
 */
export type ApplicationStatus =
  | "SUBMITTED"
  | "ACCEPTED"
  | "REJECTED"
  | "CONFIRMED"
  | "WAITLISTED"
  | "CANCELLED";

/**
 * GET /v1/events/my-applications 항목.
 *
 * **대기 순번이 없다.** 응답에 오지 않고(D5 — 비공개), 그래서 화면도 순번을 말하지 않는다.
 * 확정 인원·정원처럼 순번을 짐작하게 하는 값도 이 목록에는 싣지 않는다.
 */
export interface MyApplication {
  eventId: number;
  eventTtl: string;
  /** 서버가 분류를 조인해 이름까지 준다 — 웹이 코드 → 이름 사전을 다시 만들지 않는다 */
  eventClsfNm: string;
  eventBgngDt: string | null;
  eventEndDt: string | null;
  plcNm: string | null;
  applicationStatus: ApplicationStatus;
  /** 제출한 폼 응답 식별자 — 응답이 아직 없으면 null */
  formRspnsId: number | null;
  /** 참가자 행 식별자 — 선발 전이면 null */
  eventPtcpId: number | null;
  /** 제출 일시(ISO-8601) — 서버가 값을 갖고 있지 않으면 null */
  submittedAt: string | null;
}
