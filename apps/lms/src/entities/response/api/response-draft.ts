"use client";

import type { RspnsCn } from "@ssccops/form-renderer";
import { apiFetchAuthedNullableFromBrowser } from "@/shared/api/browser-client";

/*
 * 작성 중 응답(임시저장) 복원·저장 (서버 `GET`·`PUT /v1/forms/{formId}/responses/draft` ·
 * 브라우저 전용).
 *
 * ── 왜 브라우저 통로인가 ────────────────────────────────────
 * 기획안 작성 화면(#185)은 답을 고칠 때마다 초안을 저장하고 제출까지 하는 클라이언트
 * 화면이다 — 조회도 그 화면 안에서 일어나므로 SSR 통로(`authed-client` → `next/headers`)가
 * 아니라 `apiFetchAuthedFromBrowser`(Supabase 브라우저 세션 토큰)를 쓴다. 재제출
 * (`response-submit.ts`)과 같은 통로다.
 *
 * ── 재제출(#171)과 다른 자리 ────────────────────────────────
 * 재제출은 전체 본문 재전송이라 초안이 없다(서버 #177 결정 2). 신규 작성은 공개 폼의 초안
 * 경로를 그대로 쓴다 — 어드민 `entities/response/api/response-draft.ts`를 이 앱의 통로에
 * 맞춰 옮긴 것이고, 본문·오류 계약은 같다.
 *
 * **본문에 담는 것은 답(`rspnsCn`)뿐이다.** 응답자·상태·제출 일시는 서버가 채운다.
 */

interface FormResponseDraftApiResponse {
  formRspnsId: number | null;
  rspnsCn: RspnsCn | null;
  mdfcnDt: string | null;
}

/** 작성 중(DRAFT) 응답 한 건 */
export interface ResponseDraft {
  formRspnsId: number;
  /**
   * 서버가 **정리한 뒤의** 답 — 빈 값인 key가 빠지고 단일선택 배열은 문자열로 벗겨져 있다.
   * 방금 보낸 값과 언제나 같지는 않으므로, 화면은 이 값을 다음 저장의 기준으로 삼는다.
   */
  rspnsCn: RspnsCn;
  /** 서버가 찍은 마지막 저장 일시 (Asia/Seoul 오프셋 포함) — '마지막 저장 시각' 표시의 출처 */
  mdfcnDt: string | null;
}

function toResponseDraft(res: FormResponseDraftApiResponse): ResponseDraft {
  return {
    formRspnsId: res.formRspnsId ?? 0,
    rspnsCn: res.rspnsCn ?? {},
    mdfcnDt: res.mdfcnDt,
  };
}

/**
 * GET /v1/forms/{formId}/responses/draft — 내 작성 중 응답 복원.
 *
 * 경로에 회원 식별자가 없다 — 대상은 언제나 인증 주체 본인이다. **작성 중인 것이 없으면 204가
 * 아니라 `data`가 null인 200이다**(이미 제출을 마친 경우도 같은 빈 응답이다). 그래서 "없음"을
 * 오류가 아니라 `null`로 돌려준다.
 *
 * 조회에도 접수 가능 판정이 걸려 있어(409 `FORM_NOT_ACCEPTING`) 접수가 끝난 폼은 복원되지 않는다.
 */
export async function fetchMyResponseDraft(
  formId: number,
): Promise<ResponseDraft | null> {
  const res = await apiFetchAuthedNullableFromBrowser<FormResponseDraftApiResponse>(
    `/v1/forms/${formId}/responses/draft`,
  );
  return res === null ? null : toResponseDraft(res);
}

/**
 * PUT /v1/forms/{formId}/responses/draft — 작성 중 응답 저장(upsert).
 *
 * **부분 갱신이 아니라 통째로 덮어쓰기다** — 본문에 없는 문항의 답은 "안 바뀐 것"이 아니라
 * "지운 것"으로 처리되므로, 화면이 들고 있는 답 전체를 매번 보낸다.
 *
 * 자동 저장에는 필수·정규식·최대 선택 수 검증이 걸리지 않는다(작성 중에 어긋나 있는 것이
 * 정상이다). 다만 폼에 없는 `qitemId`·문항 유형과 맞지 않는 값·전체 크기는 여기서도 거절된다.
 */
export async function saveMyResponseDraft(
  formId: number,
  rspnsCn: RspnsCn,
): Promise<ResponseDraft> {
  const res = await apiFetchAuthedNullableFromBrowser<FormResponseDraftApiResponse>(
    `/v1/forms/${formId}/responses/draft`,
    { method: "PUT", body: JSON.stringify({ rspnsCn }) },
  );
  return res === null ? { formRspnsId: 0, rspnsCn, mdfcnDt: null } : toResponseDraft(res);
}
