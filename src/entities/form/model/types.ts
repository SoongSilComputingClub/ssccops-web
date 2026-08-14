import type { FormSttsCd, QitemTypeCd } from "@/shared/config/codes";

/** form.qitem_cpst_cn(JSONB) 내부의 페이지 구성 */
export interface FormPage {
  pageTtl: string;
  pageDescCn: string;
}

/** form.qitem_cpst_cn(JSONB) 내부의 문항 */
export interface Qitem {
  /** 문항 식별자 — 응답(rspnsCn)의 key가 된다 */
  qitemId: string;
  qitemLblNm: string;
  qitemTypeCd: QitemTypeCd;
  /** 필수 응답 여부 */
  reqYn: boolean;
  /** 0-based 페이지 인덱스. 페이지가 1개인 폼은 생략 */
  pageSeq?: number;
  optionList: string[];
  /** 단일선택 분기: 선택지 → 이동할 페이지 인덱스 */
  branchMap?: Record<string, number>;
  /** 입력 형식 검증 정규식 */
  ptrnCn?: string;
  ptrnNm?: string;
  ptrnMsgCn?: string;
  /** 다중선택 최대 선택 수 */
  maxSlctCnt?: number;
}

/** 내용J(JSONB) — 해당 폼에서 실제 사용하는 문항 구조 */
export interface QitemCpstCn {
  pages: FormPage[];
  qitems: Qitem[];
}

/* ── 서버 조회 모델 (ssccops-server #32) ────────────────────────
 *
 * form 테이블 한 행을 그대로 옮긴 목 데이터용 `Form` 타입은 지웠다(#12) — 마지막까지 그것을
 * 읽던 공개 폼 화면이 `/v1/forms/{id}/public`으로 옮겨 갔다. 서버 조회는 테이블이 아니라
 * 화면이 필요로 하는 모양으로 내려오므로(라벨 조인 · 응답 집계 포함) 아래 타입들을 쓴다.
 *
 * **목록과 상세를 한 타입으로 합치지 않는다.** 목록은 `qitemCpstCn`을 싣지 않기로 계약돼
 * 있고(폼 하나에 문항 수십 개면 목록 응답이 비대해진다), 하나로 합쳐 옵셔널로 두면 목록에서
 * 온 값을 상세처럼 그리다가 문항이 통째로 비는 사고가 난다 — 타입으로 막는다.
 */

/**
 * 화면이 보여주는 접수 상태 (ssccops-server #33 · FormReceiptStatus).
 *
 * `formSttsCd`와 접수 기간을 함께 본 **파생 값**이다. DB 컬럼도 기준 코드도 아니라서
 * shared/config/codes.ts(데이터사전 기준 코드 사전)가 아니라 여기에 둔다.
 *
 * 이 값이 따로 있는 이유는 접수 기간이 끝나도 서버가 `form_stts_cd`를 자동으로 CLOSED로
 * 바꾸지 않기 때문이다(#33 결정 — 배치 대신 표시 계층에서 구분). 그래서 `formSttsCd`만 보고
 * 배지를 그리면 이미 응답을 받지 않는 폼이 목록에서 계속 '접수 중'으로 보인다.
 *
 * - **배지는 이 값으로 그린다.**
 * - **'접수 시작 / 마감' 버튼의 활성·문구는 `formSttsCd`로 판단한다** — 전이표가 그 값으로
 *   정의돼 있어서, 파생값으로 버튼을 고르면 EXPIRED 폼을 마감할 길이 사라진다.
 */
export type FormReceiptStatus =
  /** 작성 중 (formSttsCd = DRAFT) */
  | "DRAFT"
  /** 접수 예정 — 열려 있지만 아직 시작 일시 전 */
  | "SCHEDULED"
  /** 접수 중 — 지금 응답을 받을 수 있는 유일한 상태 */
  | "ACCEPTING"
  /** 기간 종료 — formSttsCd는 아직 OPEN이지만 종료 일시가 지나 응답을 받지 않는다 */
  | "EXPIRED"
  /** 마감 — 운영자가 직접 닫았다 (formSttsCd = CLOSED) */
  | "CLOSED";

/** 목록·상세가 함께 싣는 라벨 최소 정보 (관리 화면이 쓰는 useYn·집계는 없다) */
export interface FormLabelRef {
  formLblId: number;
  lblNm: string;
}

/** GET /v1/forms 항목 — 목록 카드가 쓰는 것만 */
export interface FormSummary {
  formId: number;
  formTtlNm: string;
  formSttsCd: FormSttsCd;
  /** 배지 표기의 기준 — formSttsCd + 접수 기간을 서버가 요청마다 다시 계산한 값 */
  receiptStatus: FormReceiptStatus;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  labels: FormLabelRef[];
  /**
   * 서버 집계 응답 수. 제출 이상(SUBMITTED·ACCEPTED·REJECTED)만 세고 작성 중(DRAFT)은 빠진다
   * (ssccops-server #36). 웹이 응답 목록을 받아 세지 않는 이유는 응답이 수백 건인 폼에서
   * 목록 화면이 그 전부를 내려받게 되기 때문이다.
   */
  responseCount: number;
  mdfcnDt: string;
}

/** 상세의 응답 요약 — 목록의 responseCount와 같은 집계 규칙(DRAFT 제외)을 따른다 */
export interface FormResponseSummary {
  /** 전체 = submitted + accepted + rejected */
  total: number;
  submitted: number;
  accepted: number;
  rejected: number;
}

/** 폼 생성자 — 서버가 mbr을 조인해 이름까지 내려준다 (웹이 회원 목록에서 찾지 않는다) */
export interface FormCreator {
  mbrId: number;
  mbrNm: string;
}

/** GET /v1/forms/{formId} 항목 — 목록 항목 + 문항 구성 + 생성자 + 응답 요약 */
export interface FormDetail extends FormSummary {
  qitemCpstCn: QitemCpstCn;
  creatr: FormCreator;
  responseSummary: FormResponseSummary;
  crtDt: string;
}

/** table: form_lbl — 폼_라벨 */
export interface FormLbl {
  formLblId: number;
  /** 명V50 — 신규모집, 회원연장, 행사, 스터디, 2026, 1학기 등 */
  lblNm: string;
  /** 여부B — 신규 지정 및 필터 사용 가능 여부 */
  useYn: boolean;
  crtDt: string;
  mdfcnDt: string;
}

/**
 * GET /v1/form-labels 항목 (ssccops-server #34) — form_lbl 컬럼 + 서버 집계 usageCount.
 *
 * 목록 필터의 라벨 후보와 라벨 관리 화면이 같은 응답을 쓴다. 관리 화면의 "사용 중인 폼 N건"이
 * usageCount이며, 필터는 이 값을 쓰지 않는다.
 */
export interface FormLabelSummary extends FormLbl {
  usageCount: number;
}

/** table: form_lbl_rel — 폼_라벨_관계 */
export interface FormLblRel {
  formLblRelId: number;
  formId: number;
  formLblId: number;
  crtDt: string;
}
