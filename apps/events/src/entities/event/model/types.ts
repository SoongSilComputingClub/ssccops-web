/*
 * 공개 행사 도메인 타입 (SoongSilComputingClub/ssccops#143 · #135 — wave2 D1).
 *
 * 서버 공개 API는 병렬 구현 중이라 아직 없다 — 여기 타입은 서버와 합의된 계약을 그대로 옮긴
 * 것이다. 응답의 실제 모양을 아는 곳은 `entities/event/api` 하나로 제한하고 화면은 이 도메인
 * 타입만 본다.
 *
 * **어드민(apps/admin)의 행사 타입과 이름·어휘가 겹치지만 같은 타입이 아니다.** 공개 목록에는
 * 저장 상태(eventSttsCd)도 폼 연결(formId)도 오지 않는다 — 공개 API가 PUBLISHED만 내려주므로
 * 상태를 말할 필요가 없고, 폼은 로그인이 필요한 신청 흐름의 것이라 공개 화면이 알 일이 아니다.
 * 두 앱이 정말 같은 것을 필요로 하는지는 신청 흐름이 붙은 뒤에 드러나므로, 공유 패키지 추출은
 * 후속 이슈로 미룬다.
 */

/**
 * 행사 진행 단계 — 저장 상태와 행사 시작·종료 일시를 함께 본 **서버 파생값**이다 (D9).
 *
 * 웹이 일시를 보고 다시 계산하지 않는다 — 기준 시각을 아는 것은 서버뿐이다.
 * NONE은 행사 일시가 설정되지 않아 단계를 말할 수 없는 상태이고, 화면은 배지를 그리지 않는다.
 */
export type EventPhase = "UPCOMING" | "ONGOING" | "ENDED" | "NONE";

/**
 * 연결된 폼의 접수 상태 (D3 — 모집 기간은 폼이 유일한 진실).
 *
 * 폼이 연결되지 않은 공지형 행사는 값 자체가 null이고, 그때 화면은 모집 배지도 신청 버튼도
 * 그리지 않는다(신청이라는 개념이 없는 행사다).
 */
export type EventReceiptStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "ACCEPTING"
  | "EXPIRED"
  | "CLOSED";

/** GET /public/v1/events 항목 — 목록 카드가 쓰는 것만 (Markdown 본문은 상세에만 온다) */
export interface PublicEventSummary {
  eventId: number;
  /** event_clsf_cd — 사용자 관리 코드테이블(D13)이라 유니온을 두지 않는다 */
  eventClsfCd: string;
  /** 서버가 분류를 조인해 이름까지 내려준다 — 웹이 코드 → 이름 사전을 다시 만들지 않는다 */
  eventClsfNm: string;
  eventTtl: string;
  /** 대표 이미지 URL — 없으면 null이고 카드는 이미지 자리를 그리지 않는다 */
  thmbUrlAddr: string | null;
  eventPhase: EventPhase;
  receiptStatus: EventReceiptStatus | null;
  eventBgngDt: string | null;
  eventEndDt: string | null;
  plcNm: string | null;
}

/** GET /public/v1/events/{eventId} — 목록 항목 + 본문(Markdown)과 정원·확정 인원 */
export interface PublicEventDetail extends PublicEventSummary {
  /** 본문_내용 (Markdown) — 원시 HTML은 렌더러가 해석하지 않는다 (D12) */
  mtxtCn: string;
  /** 참가_제한_수 — 정원 없음이면 null */
  ptcpLmtCnt: number | null;
  /** 확정 참가자 수 (서버 집계) */
  confirmedCount: number;
}

/** 목록에서 뽑아낸 분류 필터 선택지 (전용 공개 엔드포인트가 계약에 없다 — api/public-events.ts 참고) */
export interface EventClassification {
  eventClsfCd: string;
  eventClsfNm: string;
}
