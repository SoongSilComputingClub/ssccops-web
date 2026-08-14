import type { AprvSttsCd, TkcgSeCd, WorkSttsCd } from "@/shared/config/codes";

/**
 * table: sub_work — 하위_업무
 * 담당자는 sub_work_pic_altmnt, 점검 목록은 sub_work_chck_list 로 분리되어 있다.
 * 화면의 D-day·마감임박·진행률은 저장하지 않고 ddlnDt·dlyYn·chckList 에서 파생한다.
 */
export interface SubWork {
  /** 식별자N19 · PK */
  subWorkId: number;
  /** FK work.work_id — 상위 업무, 필수 */
  workId: number;
  /** FK oper.oper_id — 대상 운영 */
  operId: number;
  /** 제목V256 */
  subWorkTtl: string;
  /** FK sub_work_type.sub_work_type_id — 승인 정책 결정 */
  subWorkTypeId: number;
  workSttsCd: WorkSttsCd;
  aprvSttsCd: AprvSttsCd;
  /** 내용T — 현재 유효한 계획만 */
  workCn: string | null;
  /** 내용T — 완료 조건 */
  cmptnCrtrCn: string | null;
  /** 여부B — 지연 자동 판정 */
  dlyYn: boolean;
  /** 주소V200 — 상세 논의 외부 링크 */
  otsdUrlAddr: string | null;
  /** 일시TS */
  ddlnDt: string | null;
  /** 일시TS */
  cmptnDt: string | null;
}

/** table: sub_work_chck_list — 하위_업무_점검_목록 */
export interface SubWorkChckList {
  subWorkChckListId: number;
  subWorkId: number;
  /** 내용T — "날짜 확인", "장소 표기 확인" */
  chckArtclCn: string;
  cmptnYn: boolean;
  /** 순서N5 */
  sortSeq: number;
}

/** table: sub_work_pic_altmnt — 하위_업무_담당자_배정 */
export interface SubWorkPicAltmnt {
  subWorkPicAltmntId: number;
  subWorkId: number;
  mbrId: number;
  /** 담당자 / 협업자 */
  tkcgSeCd: TkcgSeCd;
}

/** table: sub_work_stts_hstry — 하위_업무_상태_이력 */
export interface SubWorkSttsHstry {
  subWorkSttsHstryId: number;
  subWorkId: number;
  /** 수행자_ID */
  prfmrId: number;
  /** 사유T */
  chgRsn: string | null;
  /** 일시TS — 사후 수정 불가 */
  chgDt: string | null;
}
