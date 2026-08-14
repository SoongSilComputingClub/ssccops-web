import type { AtndTrgtCd, MtgSeCd, MtgSttsCd, PrcsSeCd } from "@/shared/config/codes";

/**
 * table: mtg — 회의
 * 제목·일시는 상위 테이블 oper 에 있다 (entities/oper 참조).
 */
export interface Mtg {
  /** 식별자N19 · PK */
  mtgId: number;
  /** FK oper.oper_id — 대상 운영 */
  operId: number;
  /** REGULAR 정례 / TOPIC 주제 */
  mtgSeCd: MtgSeCd | null;
  /** 전체 / 국장단 / 임시소집 */
  atndTrgtCd: AtndTrgtCd | null;
  mtgSttsCd: MtgSttsCd | null;
  /** 회의 주관자 회원_ID */
  mtgRbprsnId: number;
  /** 명V100 */
  mtgPlcNm: string | null;
  /** 내용T — 내부 상세본 */
  insdMtgDtlCn: string | null;
  /** 내용T — 제출 요약본 */
  otsdMtgDtlCn: string | null;
}

/** table: mtg_dtl — 회의_상세 (안건) */
export interface MtgDtl {
  mtgDtlId: number;
  mtgId: number;
  /** 명V100 — 운영 건과 연결되지 않은 안건의 제목 */
  agndNm: string | null;
  /** 미처리 / 보류 / 종료 */
  prcsSeCd: PrcsSeCd | null;
  /** 순서N5 */
  agndSeq: number | null;
  /**
   * 연결 운영 건.
   * @db-pending 컬럼정의서의 mtg_dtl Seq 3 이 결번이고 agnd_nm 설명이
   * "운영건ID가 NULL일 때"를 전제하므로, 누락된 oper_id 컬럼으로 본다.
   */
  operId: number | null;
  /** 내용T */
  agndCn: string | null;
  /** 내용T */
  rsltCn: string | null;
  /** 제출자_ID — 안건 제출자 */
  prsnrId: number;
}
