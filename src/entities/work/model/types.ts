import type { WorkSttsCd, WorkTypeCd } from "@/shared/config/codes";

/**
 * table: work — 업무
 * 제목·담당자·기간은 상위 테이블 oper 에 있다 (entities/oper 참조).
 */
export interface Work {
  /** 식별자N19 · PK */
  workId: number;
  /** FK oper.oper_id — 대상 운영 */
  operId: number;
  /** 행사 / 상시 / 정례운영 */
  workTypeCd: WorkTypeCd;
  /** 기획 / 진행 / 검토 / 완료 */
  workSttsCd: WorkSttsCd;
  /** 내용T — 행사 종료 회고 */
  grvwCn: string | null;
  /** 율N5,2 — 하위 완료율 집계 */
  workPrgrsRt: number;
}
