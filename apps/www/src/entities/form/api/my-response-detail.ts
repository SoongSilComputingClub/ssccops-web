import type { QitemCpstCn, RspnsCn } from "@ssccops/form-renderer";
import { apiFetchAuthed } from "@/shared/api/authed-client";
import type {
  FormResponseReviewHistory,
  MyFormResponseDetail,
  ResponseStatus,
  ReviewProcessCode,
} from "../model/types";

/*
 * 제출자용 본인 응답 상세 (서버 #177 · `GET /v1/forms/{formId}/responses/mine/{formRspnsId}`
 * · 서버 컴포넌트 전용).
 *
 * 재제출 화면의 재료 둘을 한 번에 받는다 — **왜 수정요청을 받았는가**(`reviewHistories`)와
 * **내가 뭐라고 썼는가**(`rspnsCn`). 재제출은 전체 본문 재전송이고 임시저장이 없으므로
 * (서버 #177 결정 2) 프리필이 없으면 응답자가 처음부터 다시 쳐야 한다.
 *
 * - **본인 행이 아니면 404 `FORM_RESPONSE_NOT_FOUND`** — 없는 응답과 같은 코드다(그 번호의
 *   응답이 존재하는지가 새어 나가지 않게). 화면은 둘을 똑같이 "찾을 수 없음"으로 다룬다.
 * - **접수 가능 여부를 보지 않는다** — 오히려 이 조회의 실제 쓰임이 마감 뒤에 있다.
 * - 이력 항목은 운영자용과 같은 record라 **처리자_명이 제출자에게도 실린다**(서버 #177 결정 1).
 *
 * 이 파일은 `apps/lms`의 같은 이름 조회에서 옮겨 왔다(기획안 전용 화면이 먼저 쓰던 것이다).
 * 두 앱이 같은 계약을 각자 적는 것이 되지만, 패키지로 올리려면 앱마다 다른 인증 클라이언트를
 * 주입받는 모양이 되어 지금 얻는 것보다 무겁다 — 계약이 흔들리면 그때 올린다.
 */

interface FormResponseReviewHistoryApiResponse {
  formRspnsRvwHstryId: number;
  sbmsnSeq: number | null;
  rvwPrcsSeCd: ReviewProcessCode;
  prcsMbrNm: string | null;
  rvwOpnnCn: string | null;
  prcsDt: string | null;
}

interface MyFormResponseDetailApiResponse {
  formRspnsId: number;
  rspnsSeq: number | null;
  rspnsSttsCd: ResponseStatus;
  sbmsnSeq: number | null;
  sbmsnDt: string | null;
  mdfcnDt: string | null;
  rspnsCn: RspnsCn | null;
  qitemCpstCn: QitemCpstCn | null;
  reviewHistories: FormResponseReviewHistoryApiResponse[] | null;
}

/**
 * 처리 이력 한 줄. **비어 있는 값을 채우지 않는다** — 검토 의견은 승인에서 선택이고 제출 줄에는
 * 아예 없으며, 처리자 이름이 비는 것은 조인이 빠진 배포에서만 일어난다. 어느 쪽도 "-"로 메우면
 * "값이 없다"와 "서버가 -를 줬다"를 구별할 수 없다(표시 규칙은 그리는 쪽의 몫이다).
 */
function toReviewHistory(
  res: FormResponseReviewHistoryApiResponse,
): FormResponseReviewHistory {
  return {
    formRspnsRvwHstryId: res.formRspnsRvwHstryId,
    sbmsnSeq: res.sbmsnSeq ?? null,
    rvwPrcsSeCd: res.rvwPrcsSeCd,
    prcsMbrNm: res.prcsMbrNm ?? null,
    rvwOpnnCn: res.rvwOpnnCn ?? null,
    prcsDt: res.prcsDt ?? null,
  };
}

/** 내 응답 한 건의 답 + 검토 이력 */
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
     * 문항이 없으면 재제출 폼을 그릴 수 없다. 빈 구성으로 떨어뜨려 **화면이 그 사실을 말하게**
     * 두고(폼이 "문항을 불러오지 못했습니다"로 갈린다) 여기서 던지지 않는다 — 던지면 사유를
     * 읽는 것까지 함께 막히는데, 그 둘은 다른 일이다.
     */
    qitemCpstCn: res.qitemCpstCn ?? { pages: [], qitems: [] },
    /*
     * 계약상 이력은 처리가 없어도 빈 배열이지 null이 아니다. `?? []`는 이력을 내려주지 않는
     * 옛 서버에서 화면이 통째로 죽는 대신 타임라인만 비게 하려는 것이다.
     */
    reviewHistories: (res.reviewHistories ?? []).map(toReviewHistory),
  };
}
