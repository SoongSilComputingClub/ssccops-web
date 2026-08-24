import type { Qitem, QitemCpstCn } from "@ssccops/form-renderer";
import { isChoiceQitemType, type FormSttsCd } from "@/shared/config/codes";
import { ApiError, apiFetch } from "@/shared/lib/api/client";
import { withServiceOffset } from "@/shared/lib/date";
import type {
  FormDetail,
  FormLabelRef,
  FormReceiptStatus,
  FormResponseSummary,
  FormSummary,
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
  /** 서버가 요청마다 다시 계산해 주는 파생값 (ssccops-server #33) — 배지의 기준이다 */
  receiptStatus: FormReceiptStatus | null;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  /*
   * 시스템 폼 표시와 문항 구성 버전 (ssccops-server #140). 목록에도 실린다 — 상세로 들어가기
   * 전에 잠금이 보여야 하기 때문이다.
   *
   * 셋 다 옵셔널로 잡는다. 서버가 옛 버전이면 통째로 빠지는데(AGENTS.md의 함정 절), 필수로
   * 두면 목록 카드가 `undefined`를 boolean으로 읽어 잠금이 뒤집힌 채 그려진다.
   */
  sysFormCd?: string | null;
  sysYn?: boolean | null;
  qitemVer?: number | null;
  /*
   * 다중 응답 허용 여부 (ssccops-server #143). 목록·상세 양쪽에 실린다.
   *
   * 같은 이유로 옵셔널이다 — 이 필드를 모르는 배포에서 `undefined`를 boolean으로 읽으면
   * 편집기가 "켜져 있다"고 그리고, 그 값이 그대로 저장돼 폼의 설정이 조용히 뒤집힌다.
   */
  mltplRspnsYn?: boolean | null;
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
 *
 * 생성자는 **중첩 객체가 아니라 평탄한 두 필드**다 (서버 FormDetailResponse의
 * `creatrMbrId`·`creatrMbrNm`). 계약서만 보고 `creatr` 중첩 객체로 잡아 뒀던 것이 머지된
 * 실제 응답과 어긋나 상세 화면의 생성자가 언제나 폴백('-')으로 보였다 — 터지지 않고 조용히
 * 틀린 값을 보여주는 종류라 폴백을 두지 않는다. 값이 없으면 없는 대로 드러나야 한다.
 */
interface FormDetailResponse extends FormSummaryResponse {
  qitemCpstCn: QitemCpstCn | null;
  creatrMbrId: number;
  creatrMbrNm: string;
  responseSummary: Partial<FormResponseSummary> | null;
  crtDt: string | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

function toLabelRefs(labels: FormLabelRefResponse[] | null): FormLabelRef[] {
  return (labels ?? []).map((l) => ({ formLblId: l.formLblId, lblNm: l.lblNm }));
}

/**
 * 접수 기간을 모르는 채로도 배지를 그릴 수 있게 하는 최소 폴백.
 *
 * `receiptStatus`는 항상 내려오지만(#33), 이 값이 비면 배지 조회가 `undefined`가 되어 목록이
 * 통째로 죽는다 — 파생값 하나 때문에 화면 전체를 잃지는 않는다. 다만 기간을 보고 판정할 수
 * 있는 것은 서버뿐이므로(주입된 Clock 기준) **여기서 기간을 다시 계산하지는 않는다.**
 * 즉 폴백은 상태 코드가 말하는 만큼만 말한다 — 기간이 끝난 OPEN 폼은 그때만 '접수중'으로
 * 보이는데, 그것이 서버 없이 웹이 알 수 있는 전부다.
 */
function fallbackReceiptStatus(formSttsCd: FormSttsCd): FormReceiptStatus {
  if (formSttsCd === "DRAFT") return "DRAFT";
  if (formSttsCd === "CLOSED") return "CLOSED";
  return "ACCEPTING";
}

function toFormSummary(res: FormSummaryResponse): FormSummary {
  return {
    formId: res.formId,
    formTtlNm: res.formTtlNm,
    formSttsCd: res.formSttsCd,
    receiptStatus: res.receiptStatus ?? fallbackReceiptStatus(res.formSttsCd),
    rcptBgngDt: res.rcptBgngDt,
    rcptEndDt: res.rcptEndDt,
    sysFormCd: res.sysFormCd ?? null,
    /*
     * **서버가 true라고 말할 때만 시스템 폼이다.** `?? false`가 아니라 `=== true`인 것은 뜻이
     * 아니라 습관의 문제다 — 값이 빠진 응답을 "일반 폼"으로 읽는다는 판단을 여기 한 줄에
     * 드러내 둔다. 잘못 읽어도 마지막 방어선은 서버의 409·400이며, 그 코드를 받았을 때의
     * 문구는 화면이 미리 그리는 잠금과 같다(entities/form/model/display.ts).
     */
    sysYn: res.sysYn === true,
    // 없으면 없는 대로 둔다 — 0이나 1로 채우면 "아직 안 바뀐 폼"을 지어내게 된다
    qitemVer: res.qitemVer ?? null,
    /*
     * **서버가 true라고 말할 때만 여러 건을 받는 폼이다.** sysYn과 같은 판단이며 여기서는
     * 대가가 더 크다 — 편집기는 이 값을 초안으로 받아 저장에 그대로 실어 보내므로, 빠진
     * 응답을 true로 읽으면 아무도 누르지 않은 설정이 저장 한 번에 켜진다.
     */
    mltplRspnsYn: res.mltplRspnsYn === true,
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
  const changesRequested = summary?.changesRequested ?? 0;
  const accepted = summary?.accepted ?? 0;
  const rejected = summary?.rejected ?? 0;
  return {
    // 전체를 별도로 안 주면 목록과 같은 집계값(responseCount)으로 채운다
    total: summary?.total ?? responseCount,
    submitted,
    changesRequested,
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
    creatr: { mbrId: res.creatrMbrId, mbrNm: res.creatrMbrNm },
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
  /**
   * 없는 폼 (404).
   *
   * **서버 enum 이름은 `FORM_NOT_FOUND`지만 본문에 실리는 코드 문자열은 `"NOT_FOUND"`다**
   * (`FormErrorCode.FORM_NOT_FOUND`의 두 번째 인자 · 컨트롤러 테스트가 `$.code == "NOT_FOUND"`로
   * 고정하고 있다). enum 이름을 그대로 적어 두면 어느 화면도 '없는 폼'을 알아보지 못하고
   * 전부 일반 오류로 떨어진다 — 실제로 그렇게 적혀 있었다.
   */
  FORM_NOT_FOUND: "NOT_FOUND",
  /** 필수값 누락·형식 오류 */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 문항 구성(qitemCpstCn)이 규칙 위반 */
  INVALID_QUESTION_COMPOSITION: "INVALID_QUESTION_COMPOSITION",
  /** 접수 종료가 시작보다 빠름 */
  INVALID_RECEIPT_PERIOD: "INVALID_RECEIPT_PERIOD",
  /** 응답이 있는 폼에서 기존 문항을 지우거나 바꿈 */
  QUESTION_ITEM_IN_USE: "QUESTION_ITEM_IN_USE",
  /** 전이표에 없는 상태 전이 — 화면이 들고 있는 상태가 서버와 어긋났다는 뜻이다 */
  INVALID_FORM_STATUS_TRANSITION: "INVALID_FORM_STATUS_TRANSITION",
  /** 문항이 0개인 폼을 접수 시작하려 함 */
  FORM_HAS_NO_QUESTION: "FORM_HAS_NO_QUESTION",
  /**
   * 409 — 시스템 폼을 지우려 함 (ssccops-server #140).
   *
   * **웹에는 아직 폼 삭제 경로가 없다**(서버에도 삭제 엔드포인트가 없다). 그래도 코드를 두는
   * 것은, 삭제가 생기는 날 그 화면이 문구를 새로 지어내지 않게 하기 위해서다 — 잠금 안내와
   * 거절 문구는 같은 문장이어야 한다(display.ts의 SYSTEM_FORM_DELETE_LOCKED).
   */
  SYSTEM_FORM_IMMUTABLE: "SYSTEM_FORM_IMMUTABLE",
  /**
   * 400 — 시스템 폼에서 코드가 요구하는 문항을 지움 (ssccops-server #140).
   *
   * `QUESTION_ITEM_IN_USE`(409)와 기준이 다르다. 그쪽은 "이미 받은 답이 끊긴다"라 응답이 없으면
   * 지울 수 있지만, 이쪽은 응답이 한 건도 없어도 지울 수 없다 — 대신 되돌리면 그대로 저장된다.
   *
   * **어느 문항이 요구 대상인지는 응답에 실리지 않는다.** 서버의 요구 목록(SystemFormContract)은
   * 코드 안에만 있어, 웹은 이 오류를 받고 나서야 방금 지운 문항이 그것이었음을 안다.
   */
  SYSTEM_FORM_CONTRACT_VIOLATION: "SYSTEM_FORM_CONTRACT_VIOLATION",
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
  /**
   * 다중 응답 허용 (ssccops-server #143).
   *
   * `formSttsCd`와 같은 이유로 옵셔널이 아니다. 서버는 생략을 false로 읽으므로, 자동 저장이
   * 값을 빠뜨리면 **켜 둔 폼이 타이핑 한 번에 꺼진다.** 화면이 들고 있는 현재 값을 언제나
   * 실어 보내도록 타입으로 강제한다.
   */
  mltplRspnsYn: boolean;
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

/**
 * 문항 구성을 서버로 보낼 모양으로 다듬는다.
 *
 * **폼 템플릿(#134)도 이 함수를 쓴다.** 서버는 폼과 템플릿의 문항 구성을 같은 검증기
 * (QuestionCompositionValidator)로 보므로, 웹에서 다듬는 규칙이 두 벌이 되면 템플릿에서는
 * 통과하던 구성이 그 템플릿으로 만든 폼의 저장에서 거절되는 상태가 생긴다.
 */
export function toQitemCpstBody(qitemCpstCn: QitemCpstCn): QitemCpstCn {
  return {
    pages: qitemCpstCn.pages.map((p) => ({
      pageTtl: p.pageTtl,
      pageDescCn: p.pageDescCn,
    })),
    qitems: qitemCpstCn.qitems.map(toQitemRequest),
  };
}

function toFormSaveBody(input: FormSaveInput) {
  return {
    formTtlNm: input.formTtlNm.trim(),
    formSttsCd: input.formSttsCd,
    /*
     * 빈 문자열이 아니라 null로 보낸다 — 서버의 일시 파싱이 ""를 형식 오류로 본다.
     * 값이 있으면 **오프셋을 반드시 붙인다**: 서버의 `rcptBgngDt`·`rcptEndDt`는
     * `OffsetDateTime`이라 오프셋 없는 `"2026-03-01T00:00:00"`은 본문 파싱 단계에서
     * 400으로 튕긴다(근거는 withServiceOffset 주석). 화면이 이미 붙여 보내더라도
     * 서버로 나가는 마지막 자리에서 한 번 더 보장한다 — 저장 경로는 여기 하나뿐이다.
     */
    rcptBgngDt: withServiceOffset(input.rcptBgngDt),
    rcptEndDt: withServiceOffset(input.rcptEndDt),
    qitemCpstCn: toQitemCpstBody(input.qitemCpstCn),
    mltplRspnsYn: input.mltplRspnsYn,
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

/* ── 접수 상태 전이 ─────────────────────────────────────────── */

/**
 * 상태 전이 액션 (ssccops-server #33).
 *
 * 다음 상태(`formSttsCd`)가 아니라 **액션**을 보낸다. 다음 상태를 보내는 방식은 웹이 전이표
 * (DRAFT→OPEN · OPEN→CLOSED · CLOSED→OPEN)를 들고 있어야 하고, 표가 바뀌면 서버와 따로
 * 바뀌어 어긋난다. 어느 상태로 가는지는 서버가 정한다.
 */
export type FormStatusAction = "OPEN" | "CLOSE";

/**
 * 전이 결과. 상태만이 아니라 접수 기간·파생 상태까지 함께 온다 — 버튼을 누른 직후 화면이
 * 상세를 한 번 더 조회하지 않고도 배지를 고쳐 그릴 수 있게 하기 위한 계약이다.
 */
export interface FormStatusChangeResult {
  formId: number;
  formSttsCd: FormSttsCd;
  receiptStatus: FormReceiptStatus;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  /** 서버가 안 주면 null */
  mdfcnDt: string | null;
}

interface FormStatusChangeResponse {
  formId: number | null;
  formSttsCd: FormSttsCd | null;
  receiptStatus: FormReceiptStatus | null;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  mdfcnDt: string | null;
}

/**
 * POST /v1/forms/{formId}/status — 접수 시작 · 마감.
 *
 * **폼 저장(PUT)에 상태를 실어 보내지 않는다.** 편집기의 자동 저장이 타이핑마다 PUT을 보내는데
 * 거기에 상태가 실려 있으면 저장 한 번이 접수 상태를 덮어쓴다(서버도 PUT 본문의 formSttsCd를
 * 무시한다 · #33). 접수를 여는 것은 문항을 고치는 것과 권한·검증 대상이 다른 별개의 행위다.
 *
 * 오류는 코드로 구분된다 — 전이표 밖(`INVALID_FORM_STATUS_TRANSITION`) · 문항 0개
 * (`FORM_HAS_NO_QUESTION`) · 접수 기간 모순(`INVALID_RECEIPT_PERIOD`) · 없는 폼
 * (`FORM_NOT_FOUND`). 화면 문구는 features/form의 toFormStatusErrorMessage가 맡는다.
 */
export async function changeFormStatus(
  formId: number,
  action: FormStatusAction,
): Promise<FormStatusChangeResult> {
  const res = await apiFetch<FormStatusChangeResponse | null>(
    `/v1/forms/${formId}/status`,
    { method: "POST", body: JSON.stringify({ action }) },
  );

  const formSttsCd = res?.formSttsCd ?? (action === "OPEN" ? "OPEN" : "CLOSED");
  return {
    formId: res?.formId ?? formId,
    formSttsCd,
    receiptStatus: res?.receiptStatus ?? fallbackReceiptStatus(formSttsCd),
    rcptBgngDt: res?.rcptBgngDt ?? null,
    rcptEndDt: res?.rcptEndDt ?? null,
    mdfcnDt: res?.mdfcnDt ?? null,
  };
}

/* ── 복제 ──────────────────────────────────────────────────── */

/**
 * 복제 결과 (ssccops-server #32).
 *
 * 사본은 항상 DRAFT이고 **라벨을 승계하지 않으며** 응답도 없다. 그래서 응답에 라벨·응답 수가
 * 실리지 않는다 — 늘 빈 값을 내리면 "승계되는 경우도 있나" 하는 의문만 남기 때문이다.
 */
export interface FormDuplicateResult {
  formId: number;
  sourceFormId: number;
  formTtlNm: string;
  formSttsCd: FormSttsCd;
  crtDt: string | null;
}

interface FormDuplicateResponse {
  formId: number | null;
  sourceFormId: number | null;
  formTtlNm: string | null;
  formSttsCd: FormSttsCd | null;
  crtDt: string | null;
}

/**
 * POST /v1/forms/{formId}/duplicate — 폼 복제.
 *
 * 새 `formId` 없이 성공으로 처리하지 않는다(createForm과 같은 판단). 사본으로 이동하는 것이
 * 복제의 목적이라, ID를 모른 채 "복제했습니다"만 띄우면 사용자는 방금 만든 사본을 목록에서
 * 스스로 찾아야 한다.
 */
export async function duplicateForm(formId: number): Promise<FormDuplicateResult> {
  const res = await apiFetch<FormDuplicateResponse | null>(
    `/v1/forms/${formId}/duplicate`,
    { method: "POST" },
  );

  if (!res?.formId) {
    throw new ApiError(
      FORM_ERROR.VALIDATION_FAILED,
      "복제는 됐지만 서버가 사본의 폼_ID를 돌려주지 않았습니다. 목록에서 확인해주세요",
    );
  }
  return {
    formId: res.formId,
    sourceFormId: res.sourceFormId ?? formId,
    formTtlNm: res.formTtlNm ?? "",
    formSttsCd: res.formSttsCd ?? "DRAFT",
    crtDt: res.crtDt ?? null,
  };
}
