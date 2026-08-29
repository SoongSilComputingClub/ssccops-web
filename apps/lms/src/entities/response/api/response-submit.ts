"use client";

import type { RspnsCn } from "@ssccops/form-renderer";
import { apiFetchAuthedNullableFromBrowser } from "@/shared/api/browser-client";

/*
 * 폼 응답 제출·재제출 (서버 · `POST /v1/forms/{formId}/responses` · 브라우저 전용).
 *
 * 답을 고쳐 가며 제출하는 클라이언트 화면(`views/proposal-detail`의 재제출 폼)에서 일어나므로
 * `apiFetchAuthedFromBrowser`(Supabase 브라우저 세션 토큰)를 쓴다. 조회(`*-read` 계열)와
 * 갈리는 것은 **토큰을 어디서 꺼내는가** 하나뿐이다.
 *
 * ── 재제출도 이 경로 하나다 ──────────────────────────────────
 * `POST .../responses`는 폼만 지목하고 어느 건을 이어 쓸지는 서버가 고른다 — 수정요청받은
 * 응답이 있으면 그 응답의 다음 회차로 들어가고 `sbmsn_seq`가 1 늘며 `SUBMIT` 이력이 남는다
 * (서버 `findContinuableResponse`). **재제출 중 임시저장은 열지 않는다**(서버 #177 결정 2) —
 * 재제출은 전체 본문 재전송이라 이 함수도 답(`rspnsCn`) 전체를 받는다.
 *
 * `CHANGES_REQUESTED` 재제출은 접수 마감에 막히지 않는다(서버가 판정에서 뺐다). 반려된 응답을
 * 다시 내려 하면 409 `RESPONSE_ALREADY_REJECTED`다.
 */

interface FormResponseSubmitApiResponse {
  formRspnsId: number | null;
  sbmsnDt: string | null;
}

export interface ResponseSubmitResult {
  formRspnsId: number;
  sbmsnDt: string | null;
}

/** POST /v1/forms/{formId}/responses — 답 전체를 보내 제출(재제출 포함) */
export async function submitFormResponse(
  formId: number,
  rspnsCn: RspnsCn,
): Promise<ResponseSubmitResult> {
  const res = await apiFetchAuthedNullableFromBrowser<FormResponseSubmitApiResponse>(
    `/v1/forms/${formId}/responses`,
    { method: "POST", body: JSON.stringify({ rspnsCn }) },
  );
  return { formRspnsId: res?.formRspnsId ?? 0, sbmsnDt: res?.sbmsnDt ?? null };
}
