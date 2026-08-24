import type { RspnsCn } from "@ssccops/form-renderer";
import { apiFetch } from "@/shared/lib/api/client";

/*
 * 작성 중 응답(임시저장)·제출 API (ssccops-server #35 · #36).
 *
 * 오류 코드는 폼 도메인(`entities/form`의 `PUBLIC_FORM_ERROR`)이 갖는다 — 서버가 이 세 경로의
 * 오류를 `FormErrorCode` 하나로 내리므로, 목록을 여기에 한 벌 더 두면 두 곳이 갈라진다.
 *
 * **본문에 담는 것은 답(rspnsCn)뿐이다.** 응답자(mbrId)·상태(rspnsSttsCd)·제출 일시(sbmsnDt)는
 * 전부 서버가 채운다. 예전 목 경로는 `mbrId: null`을 직접 실어 보냈는데, 비회원 응답이
 * 폐기되면서(ssccops #61) 보낼 값도 보낼 자리도 없어졌다.
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface FormResponseDraftApiResponse {
  formRspnsId: number | null;
  rspnsCn: RspnsCn | null;
  mdfcnDt: string | null;
}

interface FormResponseSubmitApiResponse {
  formRspnsId: number | null;
  sbmsnDt: string | null;
}

/* ── 작성 중 응답 ───────────────────────────────────────────── */

/** 작성 중(DRAFT) 응답 한 건 */
export interface ResponseDraft {
  formRspnsId: number;
  /**
   * 서버가 **정리한 뒤의** 답. 빈 값인 key가 빠지고 단일선택 배열은 문자열로 벗겨져 있다.
   * 그래서 방금 보낸 값과 언제나 같지는 않다 — 화면은 이 값을 다음 저장의 기준으로 삼는다.
   */
  rspnsCn: RspnsCn;
  /** 서버가 찍은 마지막 저장 일시 (Asia/Seoul 오프셋 포함). '마지막 저장 시각' 표시의 출처다 */
  mdfcnDt: string | null;
}

/**
 * GET /v1/forms/{formId}/responses/draft — 내 작성 중 응답 복원.
 *
 * 경로에 회원 식별자가 없다. 대상은 언제나 인증 주체 본인이며, 서버가 자리를 만들지 않은 것을
 * 웹이 되살리지 않는다.
 *
 * **작성 중인 것이 없으면 204가 아니라 `data`가 null인 200이다** — 이미 제출을 마친 경우도
 * 같은 빈 응답이다(제출 여부는 공개 폼 조회의 `alreadySubmitted`가 전한다). 그래서 여기서는
 * "없음"을 오류가 아니라 `null`로 돌려준다.
 *
 * 조회에도 접수 가능 판정이 걸려 있어(409 FORM_NOT_ACCEPTING) 접수가 끝난 폼은 복원되지 않는다.
 */
export async function fetchMyResponseDraft(formId: number): Promise<ResponseDraft | null> {
  const res = await apiFetch<FormResponseDraftApiResponse | null>(
    `/v1/forms/${formId}/responses/draft`,
  );
  return res === null ? null : toResponseDraft(res);
}

/**
 * PUT /v1/forms/{formId}/responses/draft — 작성 중 응답 저장(upsert).
 *
 * **부분 갱신이 아니라 통째로 덮어쓰기다.** 본문에 없는 문항의 답은 "안 바뀐 것"이 아니라
 * "지운 것"으로 처리되므로, 화면이 들고 있는 답 전체를 매번 보낸다.
 *
 * 자동 저장에는 필수·정규식·최대 선택 수 검증이 걸리지 않는다(작성 중에 어긋나 있는 것이
 * 정상이다). 다만 폼에 없는 `qitemId`·문항 유형과 맞지 않는 값·전체 크기(10만 자)는 여기서도
 * 거절되므로, 보내는 쪽이 저장 형태를 맞춰야 한다.
 */
export async function saveMyResponseDraft(
  formId: number,
  rspnsCn: RspnsCn,
): Promise<ResponseDraft> {
  const res = await apiFetch<FormResponseDraftApiResponse | null>(
    `/v1/forms/${formId}/responses/draft`,
    { method: "PUT", body: JSON.stringify({ rspnsCn }) },
  );
  return res === null ? { formRspnsId: 0, rspnsCn, mdfcnDt: null } : toResponseDraft(res);
}

function toResponseDraft(res: FormResponseDraftApiResponse): ResponseDraft {
  return {
    formRspnsId: res.formRspnsId ?? 0,
    rspnsCn: res.rspnsCn ?? {},
    mdfcnDt: res.mdfcnDt,
  };
}

/* ── 제출 ──────────────────────────────────────────────────── */

export interface ResponseSubmitResult {
  formRspnsId: number;
  /** 서버가 주입된 Clock으로 찍은 제출 일시 */
  sbmsnDt: string | null;
}

/**
 * POST /v1/forms/{formId}/responses — 제출.
 *
 * **임시저장 행이 있어도 웹은 별도 처리를 하지 않는다.** 서버가 그 행을 SUBMITTED로 바꾼다 —
 * 웹이 먼저 지우거나 새로 만들려 들면 `(form_id, mbr_id)` UNIQUE에 걸려 자동 저장을 쓴 응답자만
 * 제출하지 못하게 된다.
 */
export async function submitFormResponse(
  formId: number,
  rspnsCn: RspnsCn,
): Promise<ResponseSubmitResult> {
  const res = await apiFetch<FormResponseSubmitApiResponse | null>(
    `/v1/forms/${formId}/responses`,
    { method: "POST", body: JSON.stringify({ rspnsCn }) },
  );
  return { formRspnsId: res?.formRspnsId ?? 0, sbmsnDt: res?.sbmsnDt ?? null };
}
