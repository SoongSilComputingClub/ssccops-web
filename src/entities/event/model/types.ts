import type { EventSttsCd } from "@/shared/config/codes";

/*
 * 행사 도메인 타입 (ssccops#139 · #140 — wave2 행사관리).
 *
 * 서버 API(ssccops-server 행사 API)는 병렬 구현 중이라 아직 없다 — 여기 타입은 서버와 합의된
 * 계약을 그대로 옮긴 것이다. 응답의 실제 모양을 아는 곳은 entities/event/api 하나로 제한하고
 * (폼 도메인과 같은 판단), 화면은 아래 도메인 타입만 본다.
 */

/**
 * 행사 진행 단계 — `eventSttsCd`와 행사 시작·종료 일시를 함께 본 **서버 파생값**이다 (D9).
 *
 * DB 컬럼도 기준 코드도 아니라서 shared/config/codes.ts(데이터사전 기준 코드 사전)가 아니라
 * 여기에 둔다 — 폼의 FormReceiptStatus와 같은 자리다. 웹이 일시를 보고 다시 계산하지 않는다
 * (기준 시각을 아는 것은 서버뿐이다).
 *
 * NONE은 행사 일시가 설정되지 않아 단계를 말할 수 없는 상태다 — 화면은 배지를 그리지 않는다.
 */
export type EventPhase = "UPCOMING" | "ONGOING" | "ENDED" | "NONE";

/**
 * 연결된 폼의 접수 상태 (D3 — 모집 기간은 폼이 유일한 진실).
 *
 * 값의 어휘는 폼 도메인의 FormReceiptStatus와 같지만 **타입을 공유하지 않는다** — entities
 * 슬라이스끼리는 참조하지 않고(FSD 같은 레이어 금지), 행사 응답에서는 폼 미연결이면 필드
 * 자체가 null이라 다루는 방식도 다르다.
 */
export type EventReceiptStatus = "DRAFT" | "SCHEDULED" | "ACCEPTING" | "EXPIRED" | "CLOSED";

/** GET /v1/events 항목 — 목록 카드가 쓰는 것만 (본문·대표 이미지는 상세에만 온다) */
export interface EventSummary {
  eventId: number;
  /** event_clsf_cd — 사용자 관리 코드테이블(D13)이라 유니온을 두지 않는다 */
  eventClsfCd: string;
  /** 서버가 분류를 조인해 이름까지 내려준다 — 웹이 분류 목록에서 찾지 않는다 */
  eventClsfNm: string;
  eventTtl: string;
  eventSttsCd: EventSttsCd;
  eventPhase: EventPhase;
  /** 전속 연결된 폼 (D11). 폼 없는 공지형 행사는 null */
  formId: number | null;
  /** 연결된 폼의 접수 상태 — 폼 미연결이면 null이고 화면은 모집 배지를 그리지 않는다 */
  receiptStatus: EventReceiptStatus | null;
  eventBgngDt: string | null;
  eventEndDt: string | null;
  plcNm: string | null;
  /** 참가_제한_수 — 정원 없음이면 null */
  ptcpLmtCnt: number | null;
  /** 확정 참가자 수 (서버 집계) */
  confirmedCount: number;
  crtDt: string;
  mdfcnDt: string;
}

/** GET /v1/events/{eventId} 항목 — 목록 항목 + 본문(Markdown) + 대표 이미지 URL */
export interface EventDetail extends EventSummary {
  /** 본문_내용 (Markdown · 10만 자 상한 — 초과는 서버가 413 EVENT_CONTENT_TOO_LARGE로 거절) */
  mtxtCn: string;
  thmbUrlAddr: string | null;
}

/**
 * GET /v1/event-categories 항목 — 행사 분류 (D13 코드테이블).
 *
 * 역할 분류(role_clsf)와 같은 사용자 관리 코드테이블이다. **사용 중 행사 수 집계가 없다** —
 * 계약에 필드가 없으므로 화면이 삭제 버튼을 미리 잠글 근거도 없다. 삭제 가능 여부는 서버가
 * 409 EVENT_CLASSIFICATION_IN_USE로 판정한다. 없는 값을 만들어 내지 않는다.
 */
export interface EventCategory {
  /** PK · 생성 후 바꿀 수 없다 (역할 분류와 같은 판단 — role.role_clsf_cd 참고) */
  eventClsfCd: string;
  eventClsfNm: string;
  /** 목록 표시 순번. 서버가 이 값으로 정렬해 내려주므로 웹은 다시 정렬하지 않는다 */
  indctSeqno: number;
}
