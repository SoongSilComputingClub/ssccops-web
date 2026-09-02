import type { QitemCpstCn, RspnsCn } from "@ssccops/form-renderer";
import {
  apiFetchAuthedFromBrowser,
  apiFetchAuthedNullableFromBrowser,
} from "@/shared/api/browser-client";
import { ApiError } from "@/shared/api/client";
import type { PublicForm, ResponseDraft } from "../model/types";

/*
 * 신청서 조회·자동 저장·제출 API (ssccops-server #35 · #36 · #143).
 *
 * **'공개 폼'은 익명이라는 뜻이 아니다.** 링크를 아는 회원이면 누구나 열 수 있다는 뜻이고
 * 인증은 필요하다(ssccops#61 — 신청자는 전원 회원이다 · wave2 D2). 그래서 이 파일만 이 앱에서
 * 유일하게 **브라우저에서 인증 호출**을 한다 — 신청서 작성은 답을 고칠 때마다 저장하는 화면이라
 * 서버 렌더로 그릴 수 없다(shared/api/browser-client.ts 머리말).
 *
 * 세 경로를 한 파일에 두는 것은 서버가 이들의 오류를 `FormErrorCode` **하나로** 내리기
 * 때문이다. 파일을 나누면 아래 코드 목록도 두 벌이 되고, 그 둘은 언젠가 갈린다.
 */

/**
 * 화면이 분기에 쓰는 서버 오류 코드 (ssccops-server FormErrorCode).
 *
 * 어드민에도 같은 목록이 있지만(`entities/form/api/public-forms.ts`) 두 앱은 소스를 공유하지
 * 않는다. 여기 실린 것은 **이 앱의 화면이 실제로 분기하는 코드**뿐이라 저쪽보다 짧다 —
 * 쓰지 않는 코드를 옮겨 적으면 서버가 뜻을 바꿨을 때 고쳐야 할 자리만 는다.
 */
export const FORM_ERROR = {
  /**
   * 404 — 없는 폼.
   *
   * **서버 enum 이름은 `FORM_NOT_FOUND`지만 본문에 실리는 코드 문자열은 `"NOT_FOUND"`다**
   * (`FormErrorCode.FORM_NOT_FOUND`의 두 번째 인자). 이름으로 짐작해 분기하면 영원히 맞지 않는다.
   */
  FORM_NOT_FOUND: "NOT_FOUND",
  /**
   * 409 — 지금 응답을 받지 않는 폼.
   *
   * 폼 작성 중·마감·접수 기간 전·접수 기간 후가 **전부 이 코드 하나로** 온다. 넷을 구분해 주면
   * 링크만 가진 사람에게 준비 상태가 새어 나가므로 서버가 일부러 묶었고, 그래서 화면 문구도
   * 하나다. 문항이 실린 200을 받는 경로는 없다 — 이 코드를 받으면 문항을 그리지 않는다.
   */
  FORM_NOT_ACCEPTING: "FORM_NOT_ACCEPTING",
  /** 409 — 심사 중이거나 이미 승인된 응답이 있어 더 낼 수 없다. 자동 저장·제출 양쪽에서 온다 */
  RESPONSE_ALREADY_SUBMITTED: "RESPONSE_ALREADY_SUBMITTED",
  /** 409 — 반려된 응답을 다시 내려 했다. "이미 제출했다"와 갈린 이유는 다음 행동이 달라서다 */
  RESPONSE_ALREADY_REJECTED: "RESPONSE_ALREADY_REJECTED",
  /** 409 — 첫 자동 저장이 동시에 도착해 부딪혔다. **서버가 재시도를 요구하는 유일한 409다** */
  RESPONSE_SAVE_CONFLICT: "RESPONSE_SAVE_CONFLICT",
  /** 413 — 답 전체가 10만 자를 넘었다. 자동 저장·제출 모두에 걸린다 */
  RESPONSE_CONTENT_TOO_LARGE: "RESPONSE_CONTENT_TOO_LARGE",
  /** 400 — 폼에 없는 문항이 섞였다. 문항이 바뀐 낡은 화면이라는 뜻이다 */
  UNKNOWN_QUESTION_ITEM: "UNKNOWN_QUESTION_ITEM",
  /** 400 — 문항 유형과 맞지 않는 값. 자동 저장에서도 걸린다 */
  INVALID_ANSWER_VALUE: "INVALID_ANSWER_VALUE",
  /** 400 — 필수 문항 누락. **제출에서만** 걸린다 */
  REQUIRED_ANSWER_MISSING: "REQUIRED_ANSWER_MISSING",
  /** 400 — 형식(정규식) 불일치. **제출에서만** 걸린다 */
  ANSWER_PATTERN_MISMATCH: "ANSWER_PATTERN_MISMATCH",
  /** 400 — 최대 선택 수 초과. **제출에서만** 걸린다 */
  ANSWER_SELECTION_LIMIT_EXCEEDED: "ANSWER_SELECTION_LIMIT_EXCEEDED",
  /** 422 — 저장된 문항 구성을 서버가 읽지 못했다 */
  FORM_CONTENT_MALFORMED: "FORM_CONTENT_MALFORMED",
} as const;

/** 접수가 끝났거나 아직 열리지 않았는가 — 화면이 작성 대신 안내로 갈리는 지점이다 */
export function isFormNotAccepting(error: unknown): boolean {
  return error instanceof ApiError && error.code === FORM_ERROR.FORM_NOT_ACCEPTING;
}

/** 이미 낸 신청이 있는가 — 오류가 아니라 '내 신청'으로 보낼 신호다 */
export function isAlreadySubmitted(error: unknown): boolean {
  return error instanceof ApiError && error.code === FORM_ERROR.RESPONSE_ALREADY_SUBMITTED;
}

/* ── 폼 조회 ───────────────────────────────────────────────── */

interface PublicFormResponse {
  formId: number | null;
  formTtlNm: string | null;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  qitemCpstCn: QitemCpstCn | null;
  alreadySubmitted: boolean | null;
  submittedAt: string | null;
}

/**
 * GET /v1/forms/{formId}/public — 신청자용 폼 조회.
 *
 * 문항 구성이 비어 오면 빈 폼을 그리지 않고 그 자리에서 끊는다 — 문항이 0개라는 것은 신청자가
 * 아무것도 입력할 수 없는데 '제출하기'만 보인다는 뜻이다.
 */
export async function fetchPublicForm(formId: number): Promise<PublicForm> {
  const res = await apiFetchAuthedNullableFromBrowser<PublicFormResponse>(
    `/v1/forms/${formId}/public`,
  );

  if (!res?.qitemCpstCn) {
    throw new ApiError(
      FORM_ERROR.FORM_CONTENT_MALFORMED,
      "신청서의 문항을 불러오지 못했습니다",
    );
  }

  return {
    formId: res.formId ?? formId,
    formTtlNm: res.formTtlNm ?? "",
    rcptBgngDt: res.rcptBgngDt,
    rcptEndDt: res.rcptEndDt,
    qitemCpstCn: res.qitemCpstCn,
    /*
     * **서버가 true라고 말할 때만 '더 낼 수 없다'로 읽는다.** 이 필드를 모르는 배포의 응답을
     * true로 읽으면 낼 수 있는 사람에게 "이미 신청했습니다"가 뜬다.
     */
    alreadySubmitted: res.alreadySubmitted === true,
    submittedAt: res.submittedAt,
  };
}

/* ── 작성 중 응답(초안) ─────────────────────────────────────── */

interface ResponseDraftResponse {
  rspnsCn: RspnsCn | null;
  mdfcnDt: string | null;
}

/**
 * GET /v1/forms/{formId}/responses/draft — 작성 중이던 답 복원.
 *
 * 경로에 회원 식별자가 없다. 대상은 언제나 인증 주체 본인이며, 서버가 만들지 않은 자리를 웹이
 * 되살리지 않는다.
 *
 * **작성 중인 것이 없으면 204가 아니라 `data`가 null인 200이다.** 그래서 "없음"을 오류가 아니라
 * null로 돌려준다 — 그 null이 여기까지 오려면 `apiFetchAuthedNullableFromBrowser`를 써야 한다.
 * 오류로 세우는 쪽(`apiFetchAuthedFromBrowser`)을 쓰면 초안이 없는 **정상** 상태가 매번
 * `CLIENT_UNKNOWN_ERROR`가 되어, 한 번도 신청하지 않은 사람이 첫 진입에서 막힌다(#197).
 */
export async function fetchMyResponseDraft(formId: number): Promise<ResponseDraft | null> {
  const res = await apiFetchAuthedNullableFromBrowser<ResponseDraftResponse>(
    `/v1/forms/${formId}/responses/draft`,
  );
  return res === null ? null : { rspnsCn: res.rspnsCn ?? {}, mdfcnDt: res.mdfcnDt };
}

/**
 * PUT /v1/forms/{formId}/responses/draft — 작성 중 응답 저장(upsert).
 *
 * **부분 갱신이 아니라 통째로 덮어쓰기다.** 본문에 없는 문항의 답은 "안 바뀐 것"이 아니라
 * "지운 것"이므로 화면이 들고 있는 답 전체를 매번 보낸다.
 *
 * 자동 저장에는 필수·형식·최대 선택 수 검증이 걸리지 않는다(작성 중에 어긋나 있는 것이
 * 정상이다). 다만 폼에 없는 문항·유형과 맞지 않는 값·전체 크기는 여기서도 거절된다.
 */
export async function saveMyResponseDraft(
  formId: number,
  rspnsCn: RspnsCn,
): Promise<ResponseDraft> {
  const res = await apiFetchAuthedNullableFromBrowser<ResponseDraftResponse>(
    `/v1/forms/${formId}/responses/draft`,
    { method: "PUT", body: JSON.stringify({ rspnsCn }) },
  );
  return res === null
    ? { rspnsCn, mdfcnDt: null }
    : { rspnsCn: res.rspnsCn ?? {}, mdfcnDt: res.mdfcnDt };
}

/* ── 제출 ──────────────────────────────────────────────────── */

/**
 * POST /v1/forms/{formId}/responses — 신청서 제출.
 *
 * 임시저장 행이 있어도 웹은 따로 손대지 않는다 — 서버가 그 행을 제출됨으로 바꾼다. 웹이 먼저
 * 지우거나 새로 만들려 들면 자동 저장을 쓴 신청자만 제출하지 못하게 된다.
 */
export async function submitFormResponse(formId: number, rspnsCn: RspnsCn): Promise<void> {
  await apiFetchAuthedFromBrowser<unknown>(`/v1/forms/${formId}/responses`, {
    method: "POST",
    body: JSON.stringify({ rspnsCn }),
  });
}
