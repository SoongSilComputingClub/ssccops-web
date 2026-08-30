import { apiFetchAuthedNullable } from "@/shared/api/authed-client";
import type { MyFormResponse } from "../model/types";

/*
 * 내 응답 목록 (서버 #143 · `GET /v1/forms/{formId}/responses/mine` · 서버 컴포넌트 전용).
 *
 * 경로에 회원 식별자가 없다 — 대상은 언제나 인증 주체 본인이며, 서버가 자리를 만들지 않은
 * 것을 웹이 되살리지 않는다. **접수가 끝난 폼에서도 200이다**(자기가 낸 것을 확인하는 조회).
 * 한 건도 없으면 빈 배열, 없는 폼은 404 `FORM_NOT_FOUND`.
 *
 * 응답 내용(`rspnsCn`)은 싣지 않는다 — 목록이 답하는 것은 "몇 건을 어떤 상태로 냈는가"다.
 * 작성 중(DRAFT) 응답도 함께 온다(그때 `sbmsnDt`가 null).
 */

interface MyFormResponseApiResponse {
  formRspnsId: number;
  rspnsSeq: number | null;
  /** 대표 문항의 답 (서버 #196). 선언이 없는 폼·지워진 문항·빈 답은 전부 null이다 */
  responseTitle: string | null;
  rspnsSttsCd: MyFormResponse["rspnsSttsCd"];
  sbmsnSeq: number | null;
  sbmsnDt: string | null;
  mdfcnDt: string | null;
}

/** GET /v1/forms/{formId}/responses/mine — 내가 이 폼에 낸 응답들(서버가 준 순번 오름차순) */
export async function fetchMyFormResponses(formId: number): Promise<MyFormResponse[]> {
  const items = await apiFetchAuthedNullable<MyFormResponseApiResponse[]>(
    `/v1/forms/${formId}/responses/mine`,
  );

  return (items ?? []).map((res) => ({
    formRspnsId: res.formRspnsId,
    // 순번·회차를 모르는 배포에서 1이라고 지어내지 않는다 — 없으면 화면이 표기를 뺀다
    rspnsSeq: res.rspnsSeq ?? null,
    /*
     * 대표 문항의 답이 없는 것은 정상이다(서버 #196) — 빈 문자열도 null로 굳혀 "값이 없다"를
     * 한 가지로 만든다. 서버가 이 필드를 아직 안 싣는 배포도 같은 자리로 떨어진다.
     */
    responseTitle: res.responseTitle?.trim() || null,
    rspnsSttsCd: res.rspnsSttsCd,
    sbmsnSeq: res.sbmsnSeq ?? null,
    sbmsnDt: res.sbmsnDt,
    mdfcnDt: res.mdfcnDt,
  }));
}
