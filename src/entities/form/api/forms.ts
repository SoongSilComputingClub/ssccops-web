import type { FormSttsCd } from "@/shared/config/codes";
import { apiFetch } from "@/shared/lib/api/client";
import type {
  FormDetail,
  FormLabelRef,
  FormResponseSummary,
  FormSummary,
  QitemCpstCn,
} from "../model/types";

/*
 * 폼 조회 API (ssccops-server #32).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다.** 계약이 아직 구현 전이라
 * 필드명·중첩 구조가 흔들릴 수 있는데, 화면이 응답 객체를 그대로 들고 다니면 그때마다
 * 뷰 전체를 훑어야 한다. 여기서 도메인 타입(FormSummary·FormDetail)으로 옮기고 나면
 * 계약이 바뀌어도 고칠 곳은 아래 `to*` 함수뿐이다.
 *
 * 페칭 방식은 apiFetch + useEffect(features/form의 훅)로 간다 — 이유는 use-form-list.ts 주석 참고.
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface FormLabelRefResponse {
  formLblId: number;
  lblNm: string;
}

interface FormSummaryResponse {
  formId: number;
  formTtlNm: string;
  formSttsCd: FormSttsCd;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  labels: FormLabelRefResponse[] | null;
  responseCount: number | null;
  mdfcnDt: string;
}

/**
 * 상세 응답.
 *
 * `responseSummary`·`crtDt`는 서버 이슈(#32)에 "응답 요약(전체/제출/승인/반려)"이라고만 적혀
 * 있고 필드 이름까지는 확정돼 있지 않다. 여기서 가장 자연스러운 모양으로 잡아 두고, 없으면
 * 0/빈 값으로 떨어지게 해서 계약이 조금 달라져도 화면이 통째로 죽지 않게 한다.
 */
interface FormDetailResponse extends FormSummaryResponse {
  qitemCpstCn: QitemCpstCn | null;
  creatr: { mbrId: number; mbrNm: string } | null;
  responseSummary: Partial<FormResponseSummary> | null;
  crtDt: string | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

function toLabelRefs(labels: FormLabelRefResponse[] | null): FormLabelRef[] {
  return (labels ?? []).map((l) => ({ formLblId: l.formLblId, lblNm: l.lblNm }));
}

function toFormSummary(res: FormSummaryResponse): FormSummary {
  return {
    formId: res.formId,
    formTtlNm: res.formTtlNm,
    formSttsCd: res.formSttsCd,
    rcptBgngDt: res.rcptBgngDt,
    rcptEndDt: res.rcptEndDt,
    labels: toLabelRefs(res.labels),
    responseCount: res.responseCount ?? 0,
    mdfcnDt: res.mdfcnDt,
  };
}

function toResponseSummary(
  summary: Partial<FormResponseSummary> | null,
  responseCount: number,
): FormResponseSummary {
  const submitted = summary?.submitted ?? 0;
  const accepted = summary?.accepted ?? 0;
  const rejected = summary?.rejected ?? 0;
  return {
    // 전체를 별도로 안 주면 목록과 같은 집계값(responseCount)으로 채운다
    total: summary?.total ?? responseCount,
    submitted,
    accepted,
    rejected,
  };
}

function toFormDetail(res: FormDetailResponse): FormDetail {
  const summary = toFormSummary(res);
  return {
    ...summary,
    // 문항 구성이 비어 있어도 미리보기가 죽지 않도록 최소 형태를 보장한다
    qitemCpstCn: res.qitemCpstCn ?? { pages: [], qitems: [] },
    creatr: res.creatr ?? { mbrId: 0, mbrNm: "-" },
    responseSummary: toResponseSummary(res.responseSummary, summary.responseCount),
    crtDt: res.crtDt ?? res.mdfcnDt,
  };
}

/* ── 조회 ──────────────────────────────────────────────────── */

/** 폼 목록 필터 — 값이 없으면(null) 해당 축을 거르지 않는다 */
export interface FormListFilter {
  formSttsCd?: FormSttsCd | null;
  formLblId?: number | null;
}

/** 폼 조회가 돌려주는 오류 코드 (ssccops-server FormErrorCode) */
export const FORM_ERROR = {
  FORM_NOT_FOUND: "FORM_NOT_FOUND",
} as const;

/**
 * GET /v1/forms — 목록.
 *
 * 상태·라벨 필터를 쿼리로 보낸다. 예전에는 전체를 받아 화면에서 filter()로 걸렀는데,
 * 폼이 늘어날수록 안 쓸 데이터를 받아 버리는 구조라 서버 조건으로 옮겼다. 둘 다 주면 AND다.
 */
export async function fetchForms(filter: FormListFilter = {}): Promise<FormSummary[]> {
  const query = new URLSearchParams();
  if (filter.formSttsCd) query.set("statusCode", filter.formSttsCd);
  if (filter.formLblId != null) query.set("labelId", String(filter.formLblId));

  const qs = query.toString();
  const forms = await apiFetch<FormSummaryResponse[] | null>(
    qs ? `/v1/forms?${qs}` : "/v1/forms",
  );
  return (forms ?? []).map(toFormSummary);
}

/**
 * GET /v1/forms/{formId} — 단건 상세.
 *
 * 목록에서 find()로 고르지 않고 반드시 이 호출을 쓴다 — 목록 응답에는 `qitemCpstCn`이 없어서
 * 문항 미리보기를 그릴 수 없고, URL로 바로 들어온 경우 목록 자체가 메모리에 없다.
 * 없는 폼은 404 `FORM_NOT_FOUND`로 온다.
 */
export async function fetchForm(formId: number): Promise<FormDetail> {
  const form = await apiFetch<FormDetailResponse>(`/v1/forms/${formId}`);
  return toFormDetail(form);
}
