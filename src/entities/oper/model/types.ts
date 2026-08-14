import type { OperTypeCd, PrrtyRnkCd } from "@/shared/config/codes";

/**
 * table: oper — 운영
 * work · sub_work · mtg 의 상위 테이블. 제목·담당자·우선순위·기간·소프트삭제를 보유한다.
 */
export interface Oper {
  /** 식별자N19 · PK */
  operId: number;
  /** WORK / SUB_WORK / MEETING */
  operTypeCd: OperTypeCd;
  /** 제목V256 — 운영 주제 제목 */
  operTtl: string;
  /** 운영 건을 등록한 회원 · 인증 주체로 자동 기록, 사후 변경 불가 */
  operRgtrId: number | null;
  prrtyRnkCd: PrrtyRnkCd;
  /** 일시TS — 운영 시작 시점 */
  bgngDt: string | null;
  /** 일시TS — 운영 종료 시점 */
  endDt: string | null;
  /** 실행 책임 회원 1인 · 등록자와 다를 수 있고 이관 가능 */
  picId: number;
  /** 일시TS — 소프트 삭제 */
  delDt: string | null;
  crtDt: string;
  mdfcnDt: string;
}
