/*
 * 운영 태그 (#771 · 서버 #640 · ssccops#576).
 *
 * 태그는 운영 건(oper)에 달린다 — 업무·하위 업무·회의가 한 태그 목록을 함께 쓴다. 그래서 이 슬라이스는
 * work·sub-work·meeting 어느 쪽에도 속하지 않고, 세 엔티티의 목록·상세 타입이 아래 칩 타입을
 * 가져다 쓴다(타입만 — entities/oper·dashboard가 다른 엔티티의 타입을 가져오는 것과 같은 방향).
 */

/**
 * 운영 건에 달린 태그 칩 — 업무·하위 업무·회의의 목록 행·상세와 운영 통합 세 배열에 실린다.
 * 이름 오름차순, 없으면 빈 배열. 식별자는 어디서나 `operationTagId`라 칩에서 고른 값을 그대로
 * 목록 필터(`tagId`)에 넣는다.
 */
export interface OperationTagSummary {
  operationTagId: number;
  tagNm: string;
}

/** 태그 관리 화면의 한 행 — usageCount는 그 태그가 달린 살아 있는 운영 건(업무·하위 업무·회의 합) 수 */
export interface OperationTag extends OperationTagSummary {
  usageCount: number;
  crtDt: string | null;
  mdfcnDt: string | null;
}
