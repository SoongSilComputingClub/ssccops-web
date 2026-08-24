import { toQitemCpstBody, type QitemCpstCn } from "@/entities/form";
import type { FormSttsCd } from "@/shared/config/codes";
import { ApiError, apiFetch } from "@/shared/lib/api/client";
import type {
  FormFromTemplateResult,
  FormTemplateDetail,
  FormTemplateSaveInput,
  FormTemplateSummary,
} from "../model/types";

/*
 * 폼 템플릿 API (ssccops-server #142).
 *
 * 서버 컨트롤러가 두 경로를 함께 맡는다 — 템플릿 자원(/v1/form-templates…)과 폼의 하위 자원
 * (/v1/forms/{formId}/templates)이다. 웹도 같은 자리에 모은다: '이 폼을 템플릿으로 저장'은
 * 경로만 폼 쪽이고 규칙(이름 기본값·항상 활성·문항 구성은 서버가 읽는다)은 전부 템플릿의 것이라,
 * entities/form 에 두면 같은 규칙이 두 파일로 갈린다.
 *
 * **인가는 여섯 경로 모두 FORM_WRITE 하나다**(서버 클래스 레벨 @RequireAuthority). 조회도
 * 예외가 아니라서 라벨 관리처럼 "목록은 누구나"가 성립하지 않는다 — 메뉴를 감추는 근거가 된다.
 *
 * 목록에는 page 봉투가 없다. 템플릿은 운영진이 손으로 만드는 데이터라 수십 건을 넘지 않는다고
 * 서버가 정했고, 그래서 apiFetchList 가 아니라 apiFetch 로 받는다 — '더 보기'도 없다.
 */

/** 템플릿 API가 돌려주는 오류 코드 (ssccops-server FormErrorCode) */
export const FORM_TEMPLATE_ERROR = {
  /** 템플릿_명 누락·200자 초과, 설명 500자 초과 */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 문항 구성이 규칙 위반 — 폼 저장과 같은 검증기가 낸다 */
  INVALID_QUESTION_COMPOSITION: "INVALID_QUESTION_COMPOSITION",
  /**
   * 없는 템플릿 (404).
   *
   * **폼의 404(`"NOT_FOUND"`)와 코드 문자열이 다르다.** 한 요청에 폼과 템플릿이 함께 등장하는
   * 경로(템플릿으로 폼 만들기 · 폼을 템플릿으로 저장)가 있어 서버가 일부러 갈라 두었다 —
   * 코드가 같으면 화면은 둘 중 무엇을 찾지 못한 것인지 말할 수 없다.
   */
  FORM_TEMPLATE_NOT_FOUND: "FORM_TEMPLATE_NOT_FOUND",
  /**
   * 비활성 템플릿으로 새 폼을 만들려 했다 (400).
   *
   * 조회·수정은 막지 않는다 — 내려놓은 템플릿의 오타를 고친 뒤 다시 켜는 것이 정상 경로다.
   * 막는 것은 '여기서 새 폼을 시작하는 것' 하나뿐이다.
   */
  FORM_TEMPLATE_NOT_USABLE: "FORM_TEMPLATE_NOT_USABLE",
} as const;

/** 템플릿_명 최대 길이 — 서버 400을 기다리지 않고 먼저 걸러 준다 */
export const TMPL_NM_MAX_LENGTH = 200;
/** 템플릿_설명 최대 길이 */
export const TMPL_EXPLN_MAX_LENGTH = 500;

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface FormTemplateResponse {
  formTmplId: number;
  tmplNm: string;
  tmplExpln: string | null;
  useYn: boolean;
  qitemCnt: number | null;
  creatrMbrId: number;
  creatrMbrNm: string;
  crtDt: string | null;
  mdfcnDt: string | null;
}

interface FormTemplateDetailResponse extends FormTemplateResponse {
  qitemCpstCn: QitemCpstCn | null;
}

interface FormFromTemplateResponse {
  formId: number | null;
  formTmplId: number | null;
  formTtlNm: string | null;
  formSttsCd: FormSttsCd | null;
  crtDt: string | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

/**
 * 없는 값을 만들어 내지 않는다 — 설명이 비어 있으면 `null` 그대로 둔다. `"-"`로 채우는 것은
 * 표시 규칙이고 그것은 그리는 쪽이 정한다(AGENTS.md).
 */
function toFormTemplateSummary(res: FormTemplateResponse): FormTemplateSummary {
  return {
    formTmplId: res.formTmplId,
    tmplNm: res.tmplNm,
    tmplExpln: res.tmplExpln,
    useYn: res.useYn,
    qitemCnt: res.qitemCnt ?? 0,
    creatrMbrId: res.creatrMbrId,
    creatrMbrNm: res.creatrMbrNm,
    crtDt: res.crtDt,
    mdfcnDt: res.mdfcnDt,
  };
}

function toFormTemplateDetail(res: FormTemplateDetailResponse): FormTemplateDetail {
  return {
    ...toFormTemplateSummary(res),
    // 문항 구성이 비어 있어도 편집기가 죽지 않도록 최소 형태를 보장한다 (폼 상세와 같은 처리)
    qitemCpstCn: res.qitemCpstCn ?? { pages: [], qitems: [] },
  };
}

function toSaveBody(input: FormTemplateSaveInput) {
  const tmplExpln = input.tmplExpln?.trim() ?? "";
  return {
    tmplNm: input.tmplNm.trim(),
    // 빈 문자열이 아니라 null로 보낸다 — 설명은 선택 입력이고 서버도 없는 것으로 다룬다
    tmplExpln: tmplExpln ? tmplExpln : null,
    // 폼 저장과 **같은 함수**로 다듬는다. 근거는 entities/form 의 toQitemCpstBody 주석
    qitemCpstCn: toQitemCpstBody(input.qitemCpstCn),
  };
}

/* ── 조회 ──────────────────────────────────────────────────── */

/**
 * GET /v1/form-templates — 템플릿 목록(이름 오름차순).
 *
 * `useYn`을 주지 않으면 꺼진 템플릿까지 전부 온다. **관리 화면만 그렇게 부른다** — 거기서
 * 활성만 받으면 끈 템플릿이 목록에서 사라져 되돌릴 길이 없다. 반대로 '템플릿에서 시작' 선택지는
 * 반드시 `true`를 넘긴다: 목록에 있던 것을 골랐을 뿐인데 400이 나면 사용자는 이유를 알 수 없다.
 */
export async function fetchFormTemplates(useYn?: boolean): Promise<FormTemplateSummary[]> {
  const qs = useYn === undefined ? "" : `?useYn=${useYn}`;
  const templates = await apiFetch<FormTemplateResponse[] | null>(
    `/v1/form-templates${qs}`,
  );
  return (templates ?? []).map(toFormTemplateSummary);
}

/**
 * GET /v1/form-templates/{formTmplId} — 단건 상세.
 *
 * 목록에서 find()로 고르지 않는다 — 목록 응답에는 문항 구성이 없어 편집기를 채울 수 없고,
 * URL로 바로 들어온 경우 목록 자체가 메모리에 없다. 비활성 템플릿도 정상 조회된다.
 */
export async function fetchFormTemplate(formTmplId: number): Promise<FormTemplateDetail> {
  const template = await apiFetch<FormTemplateDetailResponse>(
    `/v1/form-templates/${formTmplId}`,
  );
  return toFormTemplateDetail(template);
}

/* ── 저장 ──────────────────────────────────────────────────── */

/**
 * POST /v1/form-templates — 새 템플릿. 생성자는 서버가 인증 주체에서 채우고 새 템플릿은 항상
 * 활성이다.
 *
 * 응답에 문항 구성이 실리지 않는 것은 계약이다(방금 보낸 것과 같은 값이라 왕복 비용만 는다).
 * 서버가 정리한 결과를 확인해야 한다면 상세 조회가 그 자리다.
 */
export async function createFormTemplate(
  input: FormTemplateSaveInput,
): Promise<FormTemplateSummary> {
  const res = await apiFetch<FormTemplateResponse | null>("/v1/form-templates", {
    method: "POST",
    body: JSON.stringify(toSaveBody(input)),
  });

  if (!res?.formTmplId) {
    throw new ApiError(
      FORM_TEMPLATE_ERROR.VALIDATION_FAILED,
      "템플릿은 만들어졌지만 서버가 템플릿 번호를 돌려주지 않았습니다. 목록에서 확인해주세요",
    );
  }
  return toFormTemplateSummary(res);
}

/** PUT /v1/form-templates/{formTmplId} — 이름·설명·문항 구성 전체 교체(부분 갱신이 아니다) */
export async function updateFormTemplate(
  formTmplId: number,
  input: FormTemplateSaveInput,
): Promise<FormTemplateSummary> {
  const res = await apiFetch<FormTemplateResponse | null>(
    `/v1/form-templates/${formTmplId}`,
    { method: "PUT", body: JSON.stringify(toSaveBody(input)) },
  );
  if (!res?.formTmplId) {
    throw new ApiError(
      FORM_TEMPLATE_ERROR.VALIDATION_FAILED,
      "저장은 됐지만 서버가 결과를 돌려주지 않았습니다. 목록에서 확인해주세요",
    );
  }
  return toFormTemplateSummary(res);
}

/**
 * PATCH /v1/form-templates/{formTmplId}/use — 사용_여부 전환.
 *
 * **삭제가 아니다.** 서버에 DELETE 자체가 없다 — 끈 템플릿도 조회·수정되고, 그 템플릿으로
 * 이미 만들어 둔 폼은 아무 영향도 받지 않는다. 꺼지는 것은 '여기서 새 폼을 시작하는 길' 하나다.
 */
export async function setFormTemplateUse(
  formTmplId: number,
  useYn: boolean,
): Promise<void> {
  await apiFetch<FormTemplateResponse | null>(`/v1/form-templates/${formTmplId}/use`, {
    method: "PATCH",
    body: JSON.stringify({ useYn }),
  });
}

/* ── 템플릿 ↔ 폼 ───────────────────────────────────────────── */

/**
 * POST /v1/form-templates/{formTmplId}/forms — 템플릿으로 새 폼 만들기.
 *
 * 제목은 선택이고 생략하면 서버가 템플릿명을 쓴다. 만들어진 폼은 DRAFT이며 접수 기간·라벨이
 * 비어 있고, 이후 템플릿을 고쳐도 바뀌지 않는다(깊은 복사다).
 *
 * 새 `formId` 없이 성공으로 처리하지 않는다(폼 복제와 같은 판단) — 만든 폼의 편집 화면으로
 * 가는 것이 이 조작의 목적이라, 번호를 모르면 사용자가 목록에서 스스로 찾아야 한다.
 */
export async function createFormFromTemplate(
  formTmplId: number,
  formTtlNm?: string,
): Promise<FormFromTemplateResult> {
  const title = formTtlNm?.trim() ?? "";
  const res = await apiFetch<FormFromTemplateResponse | null>(
    `/v1/form-templates/${formTmplId}/forms`,
    // 본문은 선택이지만 항상 보낸다 — 제목이 없으면 빈 객체라 서버가 템플릿명을 쓴다
    { method: "POST", body: JSON.stringify(title ? { formTtlNm: title } : {}) },
  );

  if (!res?.formId) {
    throw new ApiError(
      FORM_TEMPLATE_ERROR.VALIDATION_FAILED,
      "폼은 만들어졌지만 서버가 폼 번호를 돌려주지 않았습니다. 폼 목록에서 확인해주세요",
    );
  }
  return {
    formId: res.formId,
    formTmplId: res.formTmplId ?? formTmplId,
    formTtlNm: res.formTtlNm ?? "",
    formSttsCd: res.formSttsCd ?? "DRAFT",
    crtDt: res.crtDt ?? null,
  };
}

/**
 * POST /v1/forms/{formId}/templates — 이 폼의 **현재** 문항 구성을 새 템플릿으로 저장.
 *
 * 문항을 실어 보내지 않는 것이 이 요청의 요점이다. 저장 대상은 경로가 가리키는 폼에 지금
 * 저장돼 있는 구성이라, 화면이 들고 있던 초안이 아직 저장되지 않았다면 그 내용은 템플릿에
 * 담기지 않는다 — 호출부는 먼저 폼 저장을 끝낸 뒤 이 함수를 부른다.
 *
 * 접수 기간·상태·라벨·응답은 옮겨지지 않는다(템플릿에 그 자리가 없다). 이름을 생략하면
 * 폼 제목을 쓰고 새 템플릿은 언제나 활성이다.
 */
export async function createTemplateFromForm(
  formId: number,
  input: { tmplNm?: string; tmplExpln?: string } = {},
): Promise<FormTemplateSummary> {
  const tmplNm = input.tmplNm?.trim() ?? "";
  const tmplExpln = input.tmplExpln?.trim() ?? "";

  const res = await apiFetch<FormTemplateResponse | null>(`/v1/forms/${formId}/templates`, {
    method: "POST",
    body: JSON.stringify({
      ...(tmplNm ? { tmplNm } : {}),
      ...(tmplExpln ? { tmplExpln } : {}),
    }),
  });

  if (!res?.formTmplId) {
    throw new ApiError(
      FORM_TEMPLATE_ERROR.VALIDATION_FAILED,
      "템플릿은 만들어졌지만 서버가 템플릿 번호를 돌려주지 않았습니다. 템플릿 관리에서 확인해주세요",
    );
  }
  return toFormTemplateSummary(res);
}
