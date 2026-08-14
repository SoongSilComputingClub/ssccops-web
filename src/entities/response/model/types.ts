import type { RspnsSttsCd } from "@/shared/config/codes";

/**
 * 응답_내용(내용J) — 문항 ID(qitemId)를 key로 저장한다.
 * 다중선택 문항은 배열, 그 외는 문자열.
 */
export type RspnsCn = Record<string, string | string[]>;

/** table: form_rspns_hstry — 폼_응답_이력 */
export interface FormRspnsHstry {
  /** 식별자N19 · PK */
  formRspnsId: number;
  /** FK form.form_id */
  formId: number;
  /**
   * 응답을 제출한 회원.
   * @db-pending 비회원 공개폼 응답은 null이지만 DB의 mbr_id는 NOT NULL —
   * 스키마 조정(nullable 전환 또는 비회원 응답 테이블 분리)이 필요하다.
   */
  mbrId: number | null;
  /** 기본 SUBMITTED. 필요 시 ACCEPTED / REJECTED */
  rspnsSttsCd: RspnsSttsCd;
  /** 내용J */
  rspnsCn: RspnsCn;
  /** 일시TS — 사용자가 최종 제출한 일시 */
  sbmsnDt: string;
  crtDt: string;
  mdfcnDt: string;
}
