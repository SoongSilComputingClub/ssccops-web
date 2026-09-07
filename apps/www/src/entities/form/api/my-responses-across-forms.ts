import { apiFetchAuthed } from "@/shared/api/authed-client";
import type {
  FormLabel,
  MyFormResponseOverview,
  ResponseStatus,
} from "../model/types";

/*
 * 폼을 가로지르는 내 응답 목록 (서버 #270 · `GET /v1/forms/responses/mine` · 서버 컴포넌트 전용).
 *
 * **폼을 모르는 채로 부를 수 있는 유일한 응답 조회다.** 다른 조회는 전부 `/{formId}` 아래에
 * 있어 폼을 이미 아는 화면이 쓰는데, 수정요청을 받은 응답자는 정확히 그 폼 링크를 잃어버린
 * 사람이다 — 그 사이를 메우는 것이 이 조회다(ssccops#221).
 *
 * **행사 신청은 오지 않는다** — 서버가 행사에 붙은 폼을 거른다. `/v1/events/my-applications`가
 * 그쪽을 답하고 두 목록이 같은 화면에 놓이므로, 거르지 않으면 같은 응답이 두 줄로 보인다.
 * 화면에서 다시 거르지 않는다.
 *
 * `apiFetchAuthed`(SSR)를 쓰는 것은 이 앱의 규약대로다 — 세션 쿠키를 서버에서 읽으면 토큰이
 * 브라우저 코드에 실리지 않고 로딩 상태를 쥐는 훅도 필요 없다.
 */

interface FormLabelApiResponse {
  formLblId: number;
  lblNm: string | null;
}

interface MyFormResponseOverviewApiResponse {
  formId: number;
  formTtlNm: string | null;
  labels: FormLabelApiResponse[] | null;
  formRspnsId: number;
  rspnsSeq: number | null;
  responseTitle: string | null;
  rspnsSttsCd: ResponseStatus;
  sbmsnSeq: number | null;
  sbmsnDt: string | null;
  mdfcnDt: string | null;
}

/**
 * 이름이 빈 라벨은 버린다. 라벨은 거르는 칩으로도 쓰이는데 이름 없는 칩은 누를 수도, 무엇을
 * 거르는지 알 수도 없다 — 없는 것과 같으므로 목록에 세우지 않는다.
 */
function toLabels(labels: FormLabelApiResponse[] | null): FormLabel[] {
  return (labels ?? [])
    .filter((label): label is FormLabelApiResponse & { lblNm: string } =>
      Boolean(label.lblNm),
    )
    .map((label) => ({ formLblId: label.formLblId, lblNm: label.lblNm }));
}

/**
 * 로그인한 본인이 낸 폼 응답 전부.
 *
 * 페이징이 없는 계약이다 — 한 사람이 내는 응답은 폼 하나의 응답 수보다 훨씬 적다. 서버가
 * 페이징을 붙이면 그때 화면이 함께 바뀐다.
 *
 * **제목이 비어 있어도 대체값을 만들지 않는다.** 서버가 준 값과 화면이 지어낸 값을 구별할 수
 * 없게 되므로, 빈 제목을 어떻게 보일지는 그리는 쪽이 정한다.
 */
export async function fetchMyResponsesAcrossForms(): Promise<
  MyFormResponseOverview[]
> {
  const responses = await apiFetchAuthed<MyFormResponseOverviewApiResponse[]>(
    "/v1/forms/responses/mine",
  );

  return (responses ?? []).map((res) => ({
    formId: res.formId,
    formTtlNm: res.formTtlNm ?? "",
    labels: toLabels(res.labels),
    formRspnsId: res.formRspnsId,
    rspnsSeq: res.rspnsSeq ?? null,
    responseTitle: res.responseTitle ?? null,
    rspnsSttsCd: res.rspnsSttsCd,
    sbmsnSeq: res.sbmsnSeq ?? null,
    sbmsnDt: res.sbmsnDt,
    mdfcnDt: res.mdfcnDt,
  }));
}
