import type { QitemCpstCn, RspnsCn } from "@ssccops/form-renderer";

/*
 * 신청서(폼)와 응답 도메인 타입.
 *
 * **문항 구성(`QitemCpstCn`)과 답(`RspnsCn`)은 여기서 정의하지 않는다** — `@ssccops/form-renderer`
 * 한 곳에만 있다(#152). 두 앱이 같은 폼을 그리므로 타입이 갈리면 검증 규칙도 갈린다.
 * 여기 있는 것은 그 위에 얹히는 **조회 단위**뿐이다: 지금 낼 수 있는 폼인가, 이미 냈는가,
 * 작성 중이던 답이 있는가.
 */

/**
 * 응답자가 보는 폼 (GET /v1/forms/{formId}/public).
 *
 * `qitemCpstCn`이 실려 있다는 것 자체가 "지금 답을 낼 수 있다"는 뜻이다 — 접수 불가인 폼은
 * 문항을 뺀 200이 아니라 409 `FORM_NOT_ACCEPTING`으로 끊기므로 여기까지 오지 않는다.
 */
export interface PublicForm {
  formId: number;
  formTtlNm: string;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  qitemCpstCn: QitemCpstCn;
  /**
   * **"냈는가"가 아니라 "더 낼 수 없는가"다** (ssccops-server #143).
   *
   * 1건 폼에서는 두 뜻이 같고, 여러 건을 받는 폼에서는 이미 낸 뒤에도 false다. 임시저장은
   * 어느 쪽에서도 제출로 치지 않는다. 화면은 이 값이 true일 때만 작성 대신 안내를 그린다 —
   * "낼 수 있는가"를 웹이 다시 계산하면 규칙이 두 벌이 된다.
   */
  alreadySubmitted: boolean;
  /** **마지막** 제출 일시(Asia/Seoul 오프셋 포함). 한 건도 내지 않았으면 null */
  submittedAt: string | null;
  /**
   * 이 폼이 한 사람의 **여러 건**을 받는가 (ssccops-server #143).
   *
   * 켜져 있으면 이미 낸 뒤에도 또 내는 것이 정상이라 `alreadySubmitted`가 계속 false이고,
   * 화면은 제출 안내 대신 작성 폼을 그린다. 행사 신청은 1건이라 이 값을 보지 않는다 —
   * 공개 폼(`/f/{formId}`)만 쓴다.
   */
  mltplRspnsYn: boolean;
  /** 내가 이 폼에 **낸** 건수(임시저장 제외). 1건 폼에서는 0 아니면 1이다 */
  myResponseCount: number;
}

/**
 * 응답 상태 (ssccops-server `ResponseStatus`).
 *
 * `entities/application`의 `ApplicationStatus`와 **다른 축이다** — 저쪽은 참가자 상태까지
 * 합친 '신청 결과'이고 이쪽은 폼 응답 한 건의 심사 상태다. 합치면 참가자 행이 없는 폼
 * (행사에 딸리지 않은 공개 폼)에서 뜻이 무너진다.
 */
export type ResponseStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "ACCEPTED"
  | "REJECTED";

/**
 * 내가 이 폼에 낸 응답 한 건 (GET /v1/forms/{formId}/responses/mine).
 *
 * 답 내용(`rspnsCn`)은 실리지 않는다 — 서버가 계약에서 뺐고, 이 목록이 답하는 것은 "몇 건을
 * 어떤 상태로 냈는가"다.
 */
export interface MyFormResponse {
  formRspnsId: number;
  /** 응답 순번 — 모르는 배포에서는 null이고 화면이 표기를 뺀다 */
  rspnsSeq: number | null;
  rspnsSttsCd: ResponseStatus;
  /** 제출 회차(재제출마다 오른다) — 순번과 다른 값이다 */
  sbmsnSeq: number | null;
  /** 작성 중(DRAFT)이면 null */
  sbmsnDt: string | null;
  mdfcnDt: string | null;
}

/** 작성 중(DRAFT) 응답 한 건 */
export interface ResponseDraft {
  /**
   * 서버가 **정리한 뒤의** 답 — 빈 값인 key가 빠지고 단일선택 배열은 문자열로 벗겨져 있다.
   * 방금 보낸 값과 언제나 같지는 않으므로, 화면은 이 값을 다음 저장의 기준으로 삼는다.
   */
  rspnsCn: RspnsCn;
  /** 서버가 찍은 마지막 저장 일시. '방금 저장됨' 표시의 출처다 */
  mdfcnDt: string | null;
}

/** 폼 라벨 — 운영진이 폼을 분류하는 값이고, 이 화면에서 처음 응답자에게 보인다 (ssccops#221) */
export interface FormLabel {
  formLblId: number;
  lblNm: string;
}

/**
 * 폼을 가로지르는 내 응답 한 건 (GET /v1/forms/responses/mine · 서버 #270).
 *
 * `MyFormResponse`와 나뉘는 이유는 **폼을 모르는 채로 시작하기 때문**이다 — 폼 하나 안에서
 * 보는 목록은 제목이 화면 머리말에 이미 있지만, 여기서는 항목마다 그것이 실려야 무엇에 대한
 * 응답인지 알 수 있다.
 *
 * **행사 신청은 오지 않는다** — 서버가 거른다(`/v1/events/my-applications`가 그쪽을 답한다).
 * 화면이 다시 거르지 않는다.
 */
export interface MyFormResponseOverview {
  formId: number;
  formTtlNm: string;
  /** 없으면 빈 배열 — 서버가 그렇게 준다 */
  labels: FormLabel[];
  formRspnsId: number;
  rspnsSeq: number | null;
  /** 대표 문항의 답 한 줄. 선언이 없는 폼·비워 둔 답은 null이고 대체값을 만들지 않는다 */
  responseTitle: string | null;
  rspnsSttsCd: ResponseStatus;
  sbmsnSeq: number | null;
  /** 작성 중(DRAFT)이면 null */
  sbmsnDt: string | null;
  mdfcnDt: string | null;
}

/** 검토 처리 구분 — 제출도 한 줄로 들어간다 (서버 #141) */
export type ReviewProcessCode =
  | "SUBMIT"
  | "ACCEPT"
  | "REQUEST_CHANGES"
  | "REJECT";

/**
 * 처리 이력 한 줄 — `form_rspns_rvw_hstry` (서버 #141 · #177).
 *
 * 서버가 처리 일시 오름차순으로 내려주고 처리가 없으면 빈 배열이다 — 화면이 다시 정렬하지
 * 않는다. **처리자_명이 제출자에게도 보인다**(서버 #177 결정 1 — 동아리 내부 결재다).
 */
export interface FormResponseReviewHistory {
  formRspnsRvwHstryId: number;
  /** 몇 회차 제출에 대한 처리였는가. 모르는 배포에서 지어내지 않는다 */
  sbmsnSeq: number | null;
  rvwPrcsSeCd: ReviewProcessCode;
  prcsMbrNm: string | null;
  /** 승인은 의견이 선택이라 비어 있을 수 있고, 제출 줄에는 아예 없다 */
  rvwOpnnCn: string | null;
  prcsDt: string | null;
}

/**
 * 제출자용 본인 응답 상세 — `GET /v1/forms/{formId}/responses/mine/{formRspnsId}` (서버 #177).
 *
 * 재제출 화면의 재료 둘을 함께 싣는다 — **왜 수정요청을 받았는가**(`reviewHistories`)와
 * **내가 뭐라고 썼는가**(`rspnsCn`)다. 그 둘이 없으면 재제출은 전체 본문을 처음부터 다시
 * 치는 것으로만 된다(재제출은 전체 재전송이고 임시저장이 없다 · 서버 #177 결정 2).
 */
export interface MyFormResponseDetail {
  formRspnsId: number;
  rspnsSeq: number | null;
  rspnsSttsCd: ResponseStatus;
  sbmsnSeq: number | null;
  sbmsnDt: string | null;
  mdfcnDt: string | null;
  /** 이전 답 전체 — 재제출 프리필의 재료 */
  rspnsCn: RspnsCn;
  reviewHistories: FormResponseReviewHistory[];
}
