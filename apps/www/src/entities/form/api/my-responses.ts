import { apiFetchAuthedNullableFromBrowser } from "@/shared/api/browser-client";
import type { MyFormResponse, ResponseStatus } from "../model/types";

/*
 * 내 응답 목록 (ssccops-server #143 · GET /v1/forms/{formId}/responses/mine).
 *
 * **다중 응답 폼에서만 쓰인다.** 한 건만 받는 폼은 제출을 마치면 화면이 '이미 제출했습니다'로
 * 갈리므로 목록이 필요 없다 — 여러 건을 받는 폼에서만 "낸 것이 있는데 왜 또 빈 작성 화면인가"를
 * 설명할 자리가 생긴다.
 *
 * 오류 코드는 `public-form.ts`의 `FORM_ERROR` 한 벌을 함께 본다. 서버가 응답자용 경로의 오류를
 * `FormErrorCode` 하나로 내리므로 여기에 목록을 한 벌 더 두면 두 곳이 갈라진다.
 */

interface MyFormResponseApiResponse {
  formRspnsId: number;
  rspnsSeq: number | null;
  rspnsSttsCd: ResponseStatus;
  sbmsnSeq: number | null;
  sbmsnDt: string | null;
  mdfcnDt: string | null;
}

/**
 * 내가 이 폼에 낸 응답들.
 *
 * 경로에 회원 식별자가 없다 — 대상은 언제나 인증 주체 본인이며, 서버가 만들지 않은 자리를
 * 웹이 되살리지 않는다(초안 조회와 같은 규칙이다).
 *
 * **접수가 끝난 폼에서도 200이다** — 자기가 낸 것을 확인하는 조회라 접수 가능 여부와 무관하며,
 * 초안 조회(409 `FORM_NOT_ACCEPTING`이 걸린다)와 갈리는 지점이다. 한 건도 없으면 빈 배열이다.
 *
 * **작성 중(DRAFT)도 함께 온다.** 운영자용 목록이 DRAFT를 빼는 것은 남의 제출 전 답안이 심사
 * 목록에 섞이지 않게 하는 규칙이라, 내 것을 나에게 보여주는 이 조회에는 해당하지 않는다.
 */
export async function fetchMyFormResponses(formId: number): Promise<MyFormResponse[]> {
  const items = await apiFetchAuthedNullableFromBrowser<MyFormResponseApiResponse[]>(
    `/v1/forms/${formId}/responses/mine`,
  );

  return (items ?? []).map((res) => ({
    formRspnsId: res.formRspnsId,
    // 순번·회차를 모르는 배포에서 1이라고 지어내지 않는다 — 없으면 화면이 표기를 뺀다
    rspnsSeq: res.rspnsSeq ?? null,
    rspnsSttsCd: res.rspnsSttsCd,
    sbmsnSeq: res.sbmsnSeq ?? null,
    sbmsnDt: res.sbmsnDt,
    mdfcnDt: res.mdfcnDt,
  }));
}
