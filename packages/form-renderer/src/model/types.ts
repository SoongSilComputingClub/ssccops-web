import type { QitemTypeCd } from "./qitem-type";

/*
 * 폼 문항 구성(form.qitem_cpst_cn)과 응답 내용(form_rspns_hstry.rspns_cn)의 도메인 타입.
 *
 * **두 앱이 같은 타입을 본다.** 어드민은 이 구성을 편집·심사하고 공개 앱은 응답자에게 그린다.
 * 앱마다 따로 적으면 서버가 필드를 더할 때 한쪽만 따라가고, 그 어긋남은 타입이 아니라
 * "값 하나가 조용히 빈 화면"으로 드러난다.
 *
 * 이 파일에는 **JSONB 안에 실제로 들어 있는 것만** 둔다. 폼 한 건의 조회 모델(FormSummary ·
 * FormDetail)이나 응답 심사 모델(FormResponseDetail)은 앱의 운영 화면이 쓰는 모양이라
 * 각 앱의 `entities/`에 남는다.
 */

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

/**
 * 문항 하나의 답.
 *
 * **다중선택만 배열이고 나머지는 문자열이다**(ssccops-server ResponseContent). 화면 상태부터
 * 이 모양으로 들고 있어야 자동 저장이 복원해 온 값과 화면이 만든 값의 모양이 같아진다 —
 * 근거는 answers.ts 머리말에 있다.
 */
export type AnswerValue = string | string[];

/**
 * 응답_내용(내용J) — 문항 ID(qitemId)를 key로 저장한다.
 * 다중선택 문항은 배열, 그 외는 문자열.
 */
export type RspnsCn = Record<string, AnswerValue>;
