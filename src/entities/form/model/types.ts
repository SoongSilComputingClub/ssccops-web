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

/** table: form_lbl_rel — 폼_라벨_관계 */
export interface FormLblRel {
  formLblRelId: number;
  formId: number;
  formLblId: number;
  crtDt: string;
}
