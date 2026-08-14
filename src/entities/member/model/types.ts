import type { MbrGrdCd, MbrSttsCd } from "@/shared/config/codes";

/** table: mbr — 회원 */
export interface Mbr {
  /** 식별자N19 · PK */
  mbrId: number;
  /** 번호V20 · UNIQUE — 숭실대학교 학생번호 */
  stdntNo: string;
  /** 번호N5 — SSCC 가입 기수. 화면에서만 '12기'처럼 표현 */
  genNo: number;
  /** 명V50 */
  mbrNm: string;
  /** 명V100 — 소속 학과 또는 학부 명칭 */
  scsbjtNm: string | null;
  /** 번호N5 — 현재 학년 */
  scyrNo: number | null;
  /** 번호V20 */
  telno: string | null;
  /** 주소V255 */
  eml: string | null;
  /** FK mbr_grd.mbr_grd_cd */
  mbrGrdCd: MbrGrdCd;
  /** FK mbr_stts.mbr_stts_cd */
  mbrSttsCd: MbrSttsCd;
  /** 일자D — SSCC 최초 가입일 */
  joinYmd: string;
  /** 식별자UU — Supabase auth.users.id. 미로그인 이관 회원은 null */
  authUserId: string | null;
  /** 일시TS */
  crtDt: string;
  /** 일시TS */
  mdfcnDt: string;
}

/** table: mbr_grd — 회원_등급 (코드테이블) */
export interface MbrGrd {
  mbrGrdCd: MbrGrdCd;
  mbrGrdNm: string;
  /** 순번N5 — 화면 표시 및 정렬 순서 */
  indctSeqno: number;
}

/** table: mbr_stts — 회원_상태 (코드테이블) */
export interface MbrStts {
  mbrSttsCd: MbrSttsCd;
  mbrSttsNm: string;
  indctSeqno: number;
}

/** table: mbr_role_rel — 회원_역할_관계 */
export interface MbrRoleRel {
  mbrRoleId: number;
  mbrId: number;
  /** FK role.role_id */
  roleId: number;
  /** 일자D — 역할 효력 시작일 */
  roleBgngYmd: string;
  /** 일자D — 역할 효력 종료일. 현재 역할은 null */
  roleEndYmd: string | null;
  /** 여부B — 여러 현재 역할 중 대표로 표시할 역할 */
  rprsRoleYn: boolean;
  crtDt: string;
  mdfcnDt: string;
}

/** table: mbr_grd_hstry — 회원_등급_이력 */
export interface MbrGrdHstry {
  mbrGrdHstryId: number;
  mbrId: number;
  /** 최초 설정 시 null */
  bfrMbrGrdCd: MbrGrdCd | null;
  aftrMbrGrdCd: MbrGrdCd;
  /** 일자D — 변경 후 등급의 효력 시작일 */
  grdAplcnYmd: string;
  /** 내용V500 */
  grdChgRsnCn: string | null;
  /** 변경자_회원_ID */
  chnrgMbrId: number | null;
  crtDt: string;
}

/** table: mbr_stts_hstry — 회원_상태_이력 */
export interface MbrSttsHstry {
  mbrSttsHstryId: number;
  mbrId: number;
  bfrMbrSttsCd: MbrSttsCd | null;
  aftrMbrSttsCd: MbrSttsCd;
  /** 일자D — 변경 후 상태의 효력 시작일 */
  sttsAplcnYmd: string;
  /** 일자D — 휴학 등 종료 예정일이 존재하는 경우 */
  sttsEndPrnmntYmd: string | null;
  /** 내용V500 */
  sttsChgRsnCn: string | null;
  chnrgMbrId: number | null;
  crtDt: string;
}
