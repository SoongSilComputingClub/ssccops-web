import type { RspnsCn } from "@ssccops/form-renderer";
import { apiFetchAuthed } from "@/shared/api/authed-client";
import type {
  FormResponseReviewHistory,
  MyFormResponseDetail,
} from "../model/types";

/*
 * 제출자용 본인 응답 상세 (서버 #177 · `GET /v1/forms/{formId}/responses/mine/{formRspnsId}`
 * · 서버 컴포넌트 전용).
 *
 * #141이 검토 이력·재제출 흐름을 만들었지만 응답자 쪽 입구가 없었다 — 제출자는 왜 수정요청을
 * 받았는지 읽을 수 없었고 자기가 뭘 썼는지 불러올 수도 없었다. 이 조회가 그 두 가지
 * (`rspnsCn` · `reviewHistories`)를 함께 내려준다.
 *
 * - **본인 행이 아니면 404 `FORM_RESPONSE_NOT_FOUND`** — 없는 응답과 같은 코드다(존재 여부가
 *   새지 않게). 화면은 둘을 똑같이 "찾을 수 없음"으로 다룬다.
 * - **접수 가능 여부를 보지 않는다** — 오히려 이 조회의 실제 쓰임이 마감 뒤에 있다.
 * - 이력 항목은 운영자용과 같은 record라 **처리자_명(`prcsMbrNm`)이 제출자에게도 실린다**
 *   (서버 #177 결정 1). `prevFormRspnsId`·`nextFormRspnsId`(남의 응답 식별자)·회원 정보·승인
 *   미리보기는 이 응답에 없다.
 */

interface FormResponseReviewHistoryApiResponse {
  formRspnsRvwHstryId: number;
  sbmsnSeq: number | null;
  rvwPrcsSeCd: FormResponseReviewHistory["rvwPrcsSeCd"];
  prcsMbrId: number;
  prcsMbrNm: string | null;
  rvwOpnnCn: string | null;
  prcsDt: string | null;
}

interface MyFormResponseDetailApiResponse {
  formRspnsId: number;
  rspnsSeq: number | null;
  rspnsSttsCd: MyFormResponseDetail["rspnsSttsCd"];
  sbmsnSeq: number | null;
  sbmsnDt: string | null;
  mdfcnDt: string | null;
  rspnsCn: RspnsCn | null;
  reviewHistories: FormResponseReviewHistoryApiResponse[] | null;
}

/**
 * 처리 이력 한 줄. **비어 있는 값을 채우지 않는다** — 검토 의견은 승인에서 선택이고 제출 줄에는
 * 없으며, 처리자 이름이 비는 것은 조인이 빠진 배포에서만 일어난다. 어느 쪽도 "-"로 메우면
 * "값이 없다"와 "서버가 -를 줬다"를 구별할 수 없다(표시 규칙은 뷰의 몫).
 */
function toReviewHistory(
  res: FormResponseReviewHistoryApiResponse,
): FormResponseReviewHistory {
  return {
    formRspnsRvwHstryId: res.formRspnsRvwHstryId,
    sbmsnSeq: res.sbmsnSeq ?? null,
    rvwPrcsSeCd: res.rvwPrcsSeCd,
    prcsMbrId: res.prcsMbrId,
    prcsMbrNm: res.prcsMbrNm ?? "",
    rvwOpnnCn: res.rvwOpnnCn ?? null,
    prcsDt: res.prcsDt ?? null,
  };
}

/** GET /v1/forms/{formId}/responses/mine/{formRspnsId} — 내 응답 한 건의 답 + 검토 이력 */
export async function fetchMyResponseDetail(
  formId: number,
  formRspnsId: number,
): Promise<MyFormResponseDetail> {
  const res = await apiFetchAuthed<MyFormResponseDetailApiResponse>(
    `/v1/forms/${formId}/responses/mine/${formRspnsId}`,
  );

  return {
    formRspnsId: res.formRspnsId,
    rspnsSeq: res.rspnsSeq ?? null,
    rspnsSttsCd: res.rspnsSttsCd,
    sbmsnSeq: res.sbmsnSeq ?? null,
    sbmsnDt: res.sbmsnDt,
    mdfcnDt: res.mdfcnDt,
    rspnsCn: res.rspnsCn ?? {},
    /*
     * 계약상 이력은 처리가 없어도 빈 배열이지 null이 아니다. `?? []`는 이력을 내려주지 않는
     * 옛 서버에서 화면이 통째로 죽는 대신 타임라인만 비게 하려는 것이다.
     */
    reviewHistories: (res.reviewHistories ?? []).map(toReviewHistory),
  };
}
