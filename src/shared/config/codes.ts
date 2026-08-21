/**
 * 데이터사전(데이터사전+테이블컬럼정의서.xlsx) 기준 코드 사전.
 *
 * 컬럼 설명에 코드값이 명시된 것은 그대로 쓰고(DRAFT/OPEN/CLOSED 등),
 * 한글 설명만 있던 것은 여기서 영문 코드로 확정한다.
 * 화면 표시는 항상 `*_NM[code]` 조회로 얻는다 — 한글 문자열을 직접 비교하지 않는다.
 */

/** 코드 → 표시명 맵에서 코드 목록을 뽑는다 (표시 순서 = 선언 순서) */
function codesOf<T extends string>(nm: Record<T, string>): readonly T[] {
  return Object.keys(nm) as T[];
}

/* ── 회원_등급 (mbr_grd.mbr_grd_cd) ─────────────────────────── */

export type MbrGrdCd = "TEMP" | "ASSOC" | "ACTIVE" | "FULL";

export const MBR_GRD_NM: Record<MbrGrdCd, string> = {
  TEMP: "임시회원",
  ASSOC: "준회원",
  ACTIVE: "활동회원",
  FULL: "정회원",
};

export const MBR_GRD_CDS = codesOf(MBR_GRD_NM);

/* ── 회원_상태 (mbr_stts.mbr_stts_cd) ───────────────────────── */

export type MbrSttsCd =
  | "ENROLLED"
  | "LEAVE"
  | "MIL_LEAVE"
  | "GRADUATED"
  | "WITHDRAWN"
  | "EXPELLED";

export const MBR_STTS_NM: Record<MbrSttsCd, string> = {
  ENROLLED: "재학",
  LEAVE: "일반휴학",
  MIL_LEAVE: "군휴학",
  GRADUATED: "졸업",
  WITHDRAWN: "탈퇴",
  EXPELLED: "제명",
};

export const MBR_STTS_CDS = codesOf(MBR_STTS_NM);

/*
 * 역할_분류(role_clsf)는 화면에서 추가·수정·삭제하는 사용자 관리 코드테이블이라
 * 고정 유니온으로 두지 않는다 — 코드값은 서버가 준다(entities/role/api/role-classifications.ts).
 */

/* ── 운영_유형 (oper.oper_type_cd) · DB 명시 ────────────────── */

export type OperTypeCd = "WORK" | "SUB_WORK" | "MEETING";

export const OPER_TYPE_NM: Record<OperTypeCd, string> = {
  WORK: "업무",
  SUB_WORK: "하위 업무",
  MEETING: "회의",
};

export const OPER_TYPE_CDS = codesOf(OPER_TYPE_NM);

/* ── 우선_순위 (oper.prrty_rnk_cd) · DB 명시 ────────────────── */

export type PrrtyRnkCd = "HIGH" | "NORMAL" | "LOW";

export const PRRTY_RNK_NM: Record<PrrtyRnkCd, string> = {
  HIGH: "높음",
  NORMAL: "보통",
  LOW: "낮음",
};

export const PRRTY_RNK_CDS = codesOf(PRRTY_RNK_NM);

/* ── 업무_유형 (work.work_type_cd) · DB 명시 ────────────────── */

export type WorkTypeCd = "EVENT" | "REGULAR" | "ROUTINE";

export const WORK_TYPE_NM: Record<WorkTypeCd, string> = {
  EVENT: "행사",
  REGULAR: "상시",
  ROUTINE: "정례운영",
};

export const WORK_TYPE_CDS = codesOf(WORK_TYPE_NM);

/* ── 업무_상태 (work·sub_work.work_stts_cd) · DB 명시 ───────── */

export type WorkSttsCd = "PLANNING" | "IN_PROGRESS" | "REVIEW" | "DONE";

export const WORK_STTS_NM: Record<WorkSttsCd, string> = {
  PLANNING: "기획",
  IN_PROGRESS: "진행",
  REVIEW: "검토",
  DONE: "완료",
};

export const WORK_STTS_CDS = codesOf(WORK_STTS_NM);

/** 업무 상태의 진행 단계 순번 (1 기획 · 2 진행 · 3 검토 · 4 완료) */
export function workSttsStep(cd: WorkSttsCd): number {
  return WORK_STTS_CDS.indexOf(cd) + 1;
}

/* ── 승인_상태 (sub_work.aprv_stts_cd) ──────────────────────── */

export type AprvSttsCd =
  | "NOT_REQUIRED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REAPPROVAL_REQUIRED";

export const APRV_STTS_NM: Record<AprvSttsCd, string> = {
  NOT_REQUIRED: "불필요",
  PENDING: "대기",
  APPROVED: "승인",
  REJECTED: "반려",
  REAPPROVAL_REQUIRED: "재승인필요",
};

export const APRV_STTS_CDS = codesOf(APRV_STTS_NM);

/*
 * 승인자 어휘(옛 AUTZR_ROLE_NM — sub_work_type.autzr_role_cd)는 여기서 지웠다 (서버 #123).
 * 승인자는 이제 직위 코드가 아니라 결재 권한(autzr_authrt_cd)이고, 표시명(authrt_nm)은
 * 권한 관리 화면에서 바뀌는 운영 데이터라 서버가 응답과 선택지 API로 내려준다 —
 * entities/sub-work-type/api/fetchAuthorizerAuthorities 참고.
 */

/* ── 담당_구분 (sub_work_pic_altmnt.tkcg_se_cd) ─────────────── */

export type TkcgSeCd = "OWNER" | "COLLABORATOR";

export const TKCG_SE_NM: Record<TkcgSeCd, string> = {
  OWNER: "담당자",
  COLLABORATOR: "협업자",
};

export const TKCG_SE_CDS = codesOf(TKCG_SE_NM);

/* ── 긴급_구분 (sub_work_aprv.emrg_se_cd) ───────────────────── */

export type EmrgSeCd = "NORMAL" | "URGENT";

export const EMRG_SE_NM: Record<EmrgSeCd, string> = {
  NORMAL: "일반",
  URGENT: "긴급",
};

export const EMRG_SE_CDS = codesOf(EMRG_SE_NM);

/* ── 회의_구분 (mtg.mtg_se_cd) · DB 명시 ────────────────────── */

export type MtgSeCd = "REGULAR" | "TOPIC";

export const MTG_SE_NM: Record<MtgSeCd, string> = {
  REGULAR: "정례",
  TOPIC: "주제",
};

export const MTG_SE_CDS = codesOf(MTG_SE_NM);

/* ── 회의_상태 (mtg.mtg_stts_cd) ────────────────────────────── */

export type MtgSttsCd = "SCHEDULED" | "IN_PROGRESS" | "MINUTES" | "CLOSED" | "CANCELED";

export const MTG_STTS_NM: Record<MtgSttsCd, string> = {
  SCHEDULED: "예정",
  IN_PROGRESS: "진행",
  MINUTES: "회의록작성",
  CLOSED: "종료",
  CANCELED: "취소",
};

export const MTG_STTS_CDS = codesOf(MTG_STTS_NM);

/* ── 참석_대상 (mtg.atnd_trgt_cd) ───────────────────────────── */

export type AtndTrgtCd = "ALL" | "DIRECTORS" | "AD_HOC";

export const ATND_TRGT_NM: Record<AtndTrgtCd, string> = {
  ALL: "전체",
  DIRECTORS: "국장단",
  AD_HOC: "임시소집",
};

export const ATND_TRGT_CDS = codesOf(ATND_TRGT_NM);

/* ── 처리_구분 (mtg_dtl.prcs_se_cd) ─────────────────────────── */

export type PrcsSeCd = "PENDING" | "HOLD" | "CLOSED";

export const PRCS_SE_NM: Record<PrcsSeCd, string> = {
  PENDING: "미처리",
  HOLD: "보류",
  CLOSED: "종료",
};

export const PRCS_SE_CDS = codesOf(PRCS_SE_NM);

/* ── 폼_상태 (form.form_stts_cd) · DB 명시 ──────────────────── */

export type FormSttsCd = "DRAFT" | "OPEN" | "CLOSED";

export const FORM_STTS_NM: Record<FormSttsCd, string> = {
  DRAFT: "작성 중",
  OPEN: "접수 중",
  CLOSED: "마감",
};

export const FORM_STTS_CDS = codesOf(FORM_STTS_NM);

/* ── 응답_상태 (form_rspns_hstry.rspns_stts_cd) · DB 명시 ───── */

export type RspnsSttsCd = "DRAFT" | "SUBMITTED" | "ACCEPTED" | "REJECTED";

/**
 * 작성 중(DRAFT)의 표시명에 "미제출"을 붙여 둔다.
 *
 * 폼_상태의 DRAFT("작성 중")와 글자가 같은데 의미가 전혀 다르다 — 폼의 작성 중은 운영자가
 * 편집 중인 폼이고, 응답의 작성 중은 **지원자가 아직 제출하지 않은 답안**이다. 목록에서 이
 * 둘을 같은 문구로 보여 주면 운영자가 "제출된 응답"으로 오해하고 심사하게 된다.
 */
export const RSPNS_STTS_NM: Record<RspnsSttsCd, string> = {
  DRAFT: "작성 중(미제출)",
  SUBMITTED: "제출",
  ACCEPTED: "승인",
  REJECTED: "반려",
};

export const RSPNS_STTS_CDS = codesOf(RSPNS_STTS_NM);

/**
 * 심사 대상 상태 — DRAFT를 뺀 나머지.
 *
 * 상태 변경 시트가 도는 목록이다. `RSPNS_STTS_CDS`를 그대로 돌리면 DRAFT 칩이 생겨
 * "제출 전 답안을 운영자가 승인해 확정시키는" 조작이 화면에 열린다 — 서버도 그 전이를
 * 400 `INVALID_RESPONSE_STATUS_TRANSITION`으로 거절하므로(ssccops-server #37) 애초에
 * 고를 수 없어야 한다.
 */
export const RSPNS_RVW_STTS_CDS = RSPNS_STTS_CDS.filter((cd) => cd !== "DRAFT");

/* ── 허용_행위 (dlgt.prm_act_cd) ────────────────────────────── */

export type PrmActCd = "APPROVE" | "PROCEED" | "VIEW";

export const PRM_ACT_NM: Record<PrmActCd, string> = {
  APPROVE: "승인",
  PROCEED: "진행",
  VIEW: "조회",
};

export const PRM_ACT_CDS = codesOf(PRM_ACT_NM);

/* ── 보고_주기 (dlgt.rpt_cycle_cd) ──────────────────────────── */

export type RptCycleCd = "DAILY" | "WEEKLY" | "MONTHLY";

export const RPT_CYCLE_NM: Record<RptCycleCd, string> = {
  DAILY: "일간",
  WEEKLY: "주간",
  MONTHLY: "월간",
};

export const RPT_CYCLE_CDS = codesOf(RPT_CYCLE_NM);

/* ── 문항 유형 (form.qitem_cpst_cn JSONB 내부) ──────────────── */

export type QitemTypeCd =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "SINGLE_CHOICE"
  | "MULTI_CHOICE"
  | "DATE";

export const QITEM_TYPE_NM: Record<QitemTypeCd, string> = {
  SHORT_TEXT: "단답형",
  LONG_TEXT: "장문형",
  SINGLE_CHOICE: "단일선택",
  MULTI_CHOICE: "다중선택",
  DATE: "날짜",
};

export const QITEM_TYPE_CDS = codesOf(QITEM_TYPE_NM);

/** 선택지를 갖는 문항 유형인지 */
export function isChoiceQitemType(cd: QitemTypeCd): boolean {
  return cd === "SINGLE_CHOICE" || cd === "MULTI_CHOICE";
}
