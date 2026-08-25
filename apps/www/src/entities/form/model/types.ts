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
