import type { RspnsSttsCd } from "@/shared/config/codes";
import { apiFetch } from "@/shared/lib/api/client";
import type { MyFormResponse } from "../model/types";

/*
 * 내 응답 목록 API (ssccops-server #143 · GET /v1/forms/{formId}/responses/mine).
 *
 * **운영자용 목록(api/responses.ts)과 파일을 나눈다.** 서버가 컨트롤러와 응답 스키마를 나눈
 * 것과 같은 이유다 — 저쪽은 남의 응답을 심사하는 화면이라 응답자 정보(회원_명·학번·학과·
 * 등급·상태)를 싣지만 여기서는 그 회원이 요청 주체 본인이라 실을 이유가 없고, 한 파일에서
 * 두 응답을 함께 다루면 운영자용 필드가 늘 때마다 공개 링크 쪽으로 새어 나갈 것이 함께 는다.
 *
 * 오류 코드는 폼 도메인(`entities/form`의 `PUBLIC_FORM_ERROR`)이 갖는다 — 서버가 응답자용
 * 경로의 오류를 `FormErrorCode` 하나로 내리므로, 목록을 여기에 한 벌 더 두면 두 곳이 갈라진다.
 * (api/response-draft.ts와 같은 규칙이다.)
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface MyFormResponseApiResponse {
  formRspnsId: number;
  rspnsSeq: number | null;
  rspnsSttsCd: RspnsSttsCd;
  sbmsnSeq: number | null;
  sbmsnDt: string | null;
  mdfcnDt: string | null;
}

/* ── 조회 ──────────────────────────────────────────────────── */

/**
 * GET /v1/forms/{formId}/responses/mine — 내가 이 폼에 낸 응답들.
 *
 * 경로에 회원 식별자가 없다. 대상은 언제나 인증 주체 본인이며, 서버가 자리를 만들지 않은 것을
 * 웹이 되살리지 않는다(자동 저장 조회와 같은 규칙이다).
 *
 * **접수가 끝난 폼에서도 200이다** — 자기가 낸 것을 확인하는 조회라 접수 가능 여부와 무관하며,
 * 자동 저장 조회(409 FORM_NOT_ACCEPTING이 걸린다)와 갈리는 지점이다. 한 건도 없으면 빈 배열,
 * 없는 폼은 404 `FORM_NOT_FOUND`다.
 *
 * **작성 중(DRAFT) 응답도 함께 온다.** 운영자용 목록이 DRAFT를 빼는 것은 남의 제출 전 답안이
 * 심사 목록에 섞이지 않게 하는 규칙이라, 내 것을 나에게 보여주는 이 조회에는 해당하지 않는다.
 * 그 응답은 `sbmsnDt`가 null이다.
 *
 * 응답 내용(rspnsCn)은 싣지 않는다 — 서버가 계약에서 뺐고, 지금 필요한 것은 "몇 건을 냈고
 * 각각 어떤 상태인가"다.
 */
export async function fetchMyFormResponses(formId: number): Promise<MyFormResponse[]> {
  const items = await apiFetch<MyFormResponseApiResponse[] | null>(
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
