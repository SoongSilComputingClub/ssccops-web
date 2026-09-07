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
