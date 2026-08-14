import type { EmrgSeCd } from "@/shared/config/codes";

/** table: sub_work_aprv — 하위_업무_승인 */
export interface SubWorkAprv {
  /** 식별자N19 · PK */
  subWorkAprvId: number;
  /** FK sub_work.sub_work_id */
  subWorkId: number;
  /** 승인 처리 주체 회원 — 유형의 승인자_역할에 해당하는 회원 */
  mbrId: number;
  /** 일시TS — 책임자 승인 일시. 미승인은 null */
  subWorkAprvDt: string | null;
  /** 여부B — 등록자=승인자 식별 */
  rgtrAprvYn: boolean;
  /** 일반 / 긴급 */
  emrgSeCd: EmrgSeCd;
  /** 사유T — 긴급 시 필수 */
  emrgRsn: string | null;
  /** 일자D — 사후 승인 기한 */
  epfcAprvTermYmd: string | null;
  /** 단계V20 — 위험도 기반 승인 단계 */
  aprvStp: string | null;
}

/** table: sub_work_aprv_vote — 하위_업무_승인_투표 */
export interface SubWorkAprvVote {
  aprvVoteId: number;
  subWorkAprvId: number;
  mbrId: number;
  /** 여부B — 찬성/반대 */
  agreYn: boolean | null;
  voteDt: string | null;
}

/** table: sub_work_rjct — 하위_업무_반려 */
export interface SubWorkRjct {
  subWorkRjctId: number;
  subWorkId: number;
  /** 반려 처리 회원 */
  mbrId: number;
  /** 사유T */
  rjctRsn: string | null;
}

/** 정족수 집계 — sub_work_type.minNeedAgreCnt + 투표 결과에서 파생 */
export interface AgreTally {
  need: number;
  agre: number;
  dsagre: number;
}
