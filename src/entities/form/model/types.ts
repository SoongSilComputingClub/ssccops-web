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

/** table: form — 폼 */
export interface Form {
  /** 식별자N19 · PK */
  formId: number;
  /** 폼을 생성한 회원 */
  creatrMbrId: number;
  /** 명V200 — 폼 화면 및 목록 표시 제목 */
  formTtlNm: string;
  /** DRAFT / OPEN / CLOSED */
  formSttsCd: FormSttsCd;
  /** 일시TS — 응답 접수 시작일시 */
  rcptBgngDt: string | null;
  /** 일시TS — 응답 접수 종료일시 */
  rcptEndDt: string | null;
  /** 내용J */
  qitemCpstCn: QitemCpstCn;
  crtDt: string;
  mdfcnDt: string;
}

/* ── 서버 조회 모델 (ssccops-server #32) ────────────────────────
 *
 * 위 `Form`은 form 테이블 한 행을 그대로 옮긴 목 데이터용 타입이다. 서버 조회는 테이블이
 * 아니라 화면이 필요로 하는 모양으로 내려오므로(라벨 조인 · 응답 집계 포함) 별도 타입으로 둔다.
 *
 * **목록과 상세를 한 타입으로 합치지 않는다.** 목록은 `qitemCpstCn`을 싣지 않기로 계약돼
 * 있고(폼 하나에 문항 수십 개면 목록 응답이 비대해진다), 하나로 합쳐 옵셔널로 두면 목록에서
 * 온 값을 상세처럼 그리다가 문항이 통째로 비는 사고가 난다 — 타입으로 막는다.
 */

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
