import { isChoiceQitemType, type FormSttsCd } from "@/shared/config/codes";
import { ApiError, apiFetch } from "@/shared/lib/api/client";
import type {
  FormDetail,
  FormLabelRef,
  FormResponseSummary,
  FormSummary,
  Qitem,
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

/** 폼 조회·저장이 돌려주는 오류 코드 (ssccops-server FormErrorCode) */
export const FORM_ERROR = {
  FORM_NOT_FOUND: "FORM_NOT_FOUND",
  /** 필수값 누락·형식 오류 */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 문항 구성(qitemCpstCn)이 규칙 위반 */
  INVALID_QUESTION_COMPOSITION: "INVALID_QUESTION_COMPOSITION",
  /** 접수 종료가 시작보다 빠름 */
  INVALID_RECEIPT_PERIOD: "INVALID_RECEIPT_PERIOD",
  /** 응답이 있는 폼에서 기존 문항을 지우거나 바꿈 */
  QUESTION_ITEM_IN_USE: "QUESTION_ITEM_IN_USE",
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

/* ── 저장 ──────────────────────────────────────────────────── */

/**
 * 폼 저장 입력 — 생성(POST)과 수정(PUT)이 같은 본문을 쓴다.
 *
 * `formSttsCd`를 옵셔널로 두지 않는다. 서버는 미지정을 DRAFT로 해석하는데(#32), 자동 저장이
 * 값을 빠뜨리면 접수 중이던 폼이 저장 한 번에 작성 중으로 되돌아간다. 접수 시작·마감은 별도
 * API(#33)의 몫이므로 여기서는 **화면이 들고 있는 현재 값을 그대로 실어 보내도록 강제**한다.
 *
 * `labelIds`도 이 본문에 함께 보낸다 — 라벨 지정 경로를 폼 저장 하나로 통일하기로 #10과
 * 맞췄다. 자동 저장 화면에서 `PUT /v1/forms/{id}/labels`를 따로 부르면 두 요청의 도착 순서에
 * 따라 방금 끈 라벨이 되살아나는 등 지정이 튄다.
 */
export interface FormSaveInput {
  formTtlNm: string;
  formSttsCd: FormSttsCd;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  qitemCpstCn: QitemCpstCn;
  labelIds: number[];
}

/** 저장 결과 — 신규 생성 시 받은 formId가 이후 PUT 경로가 된다 */
export interface FormSaveResult {
  formId: number;
  /** 서버가 안 주면 null (계약 미확정) */
  mdfcnDt: string | null;
}

interface FormSaveResponse {
  formId: number | null;
  mdfcnDt: string | null;
}

/**
 * 문항 하나를 유형에 맞는 필드만 남기고 다듬는다.
 *
 * 서버는 "비선택형에 optionList가, 비텍스트형에 ptrnCn이 남아 있으면 정리하거나 거절"이라고만
 * 정해 두었다(#32). 어느 쪽을 고를지 서버가 미정이므로 **웹이 먼저 지워서 보낸다** — 편집 중
 * 유형을 여러 번 바꾸면 이전 유형의 잔재가 draft에 남는데, 그게 그대로 나가면 저장이 400으로
 * 튕기는 배포가 존재할 수 있다. 지우고 보내면 어느 정책이든 통과한다.
 */
function toQitemRequest(qitem: Qitem): Qitem {
  const choice = isChoiceQitemType(qitem.qitemTypeCd);
  const text = qitem.qitemTypeCd === "SHORT_TEXT" || qitem.qitemTypeCd === "LONG_TEXT";

  return {
    qitemId: qitem.qitemId,
    qitemLblNm: qitem.qitemLblNm,
    qitemTypeCd: qitem.qitemTypeCd,
    reqYn: qitem.reqYn,
    pageSeq: qitem.pageSeq ?? 0,
    optionList: choice ? qitem.optionList : [],
    // 분기는 단일선택 전용, 최대 선택 수는 다중선택 전용이다
    ...(qitem.qitemTypeCd === "SINGLE_CHOICE" && qitem.branchMap
      ? { branchMap: qitem.branchMap }
      : {}),
    ...(qitem.qitemTypeCd === "MULTI_CHOICE" && qitem.maxSlctCnt !== undefined
      ? { maxSlctCnt: qitem.maxSlctCnt }
      : {}),
    ...(text && qitem.ptrnCn
      ? { ptrnCn: qitem.ptrnCn, ptrnNm: qitem.ptrnNm, ptrnMsgCn: qitem.ptrnMsgCn }
      : {}),
  };
}

function toFormSaveBody(input: FormSaveInput) {
  return {
    formTtlNm: input.formTtlNm.trim(),
    formSttsCd: input.formSttsCd,
    // 빈 문자열이 아니라 null로 보낸다 — 서버의 일시 파싱이 ""를 형식 오류로 볼 수 있다
    rcptBgngDt: input.rcptBgngDt || null,
    rcptEndDt: input.rcptEndDt || null,
    qitemCpstCn: {
      pages: input.qitemCpstCn.pages.map((p) => ({
        pageTtl: p.pageTtl,
        pageDescCn: p.pageDescCn,
      })),
      qitems: input.qitemCpstCn.qitems.map(toQitemRequest),
    },
    labelIds: input.labelIds,
  };
}

/**
 * POST /v1/forms — 신규 폼 생성. 자동 저장에서 **한 폼당 정확히 한 번만** 호출된다.
 *
 * 응답 본문의 모양이 아직 확정되지 않아(#32는 `FormSaveResponse` record라고만 적혀 있다)
 * formId가 비어 오는 배포를 만나면 그 자리에서 끊는다 — formId 없이 성공으로 처리하면
 * 이후 저장이 계속 POST로 나가 폼이 편집할 때마다 새로 생긴다.
 */
export async function createForm(input: FormSaveInput): Promise<FormSaveResult> {
  const res = await apiFetch<FormSaveResponse | null>("/v1/forms", {
    method: "POST",
    body: JSON.stringify(toFormSaveBody(input)),
  });

  if (!res?.formId) {
    throw new ApiError(
      FORM_ERROR.VALIDATION_FAILED,
      "폼은 생성됐지만 서버가 폼_ID를 돌려주지 않았습니다. 목록에서 확인해주세요",
    );
  }
  return { formId: res.formId, mdfcnDt: res.mdfcnDt ?? null };
}

/** PUT /v1/forms/{formId} — 문항 구성 전체 교체. 두 번째 자동 저장부터 이 경로를 쓴다 */
export async function updateForm(
  formId: number,
  input: FormSaveInput,
): Promise<FormSaveResult> {
  const res = await apiFetch<FormSaveResponse | null>(`/v1/forms/${formId}`, {
    method: "PUT",
    body: JSON.stringify(toFormSaveBody(input)),
  });
  return { formId: res?.formId ?? formId, mdfcnDt: res?.mdfcnDt ?? null };
}
