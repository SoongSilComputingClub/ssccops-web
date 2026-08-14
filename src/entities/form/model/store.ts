"use client";

import { create } from "zustand";
import formSeed from "../api/get-form.json";
import type { Form, FormReceiptStatus } from "./types";

interface FormState {
  forms: Form[];
}

/*
 * `saveForm`·`setFormLbls`는 지웠다. 폼 편집기가 서버(POST·PUT /v1/forms)로 저장하게 됐고,
 * 라벨 지정도 그 본문의 labelIds로 함께 나간다(#8 · #10 합의). 목 구현을 남겨 두면 서버로
 * 저장한 뒤에도 화면이 메모리 배열을 고치는 경로가 되살아나, 새로고침하면 사라지는 저장이
 * 다시 생긴다.
 *
 * 라벨(`formLbls`·`formLblRels`·`addFormLbl`·`toggleFormLbl`·`formLblsOf`)도 같은 이유로
 * 지웠다(#10). 목록·추가·사용_여부는 이제 `/v1/form-labels`가, 폼별 지정은 폼 저장 본문이
 * 담당한다. 특히 "사용 중인 폼 N건"을 세던 `formLblRels`는 이 브라우저가 들고 있던 목 배열일
 * 뿐이라 실제 지정 수와 무관했다 — 서버 집계(`usageCount`)로 대체됐다.
 *
 * `updateForm`·`duplicateForm`도 같은 이유로 지웠다(#9). 접수 상태 전이와 복제는 각각
 * `POST /v1/forms/{formId}/status`·`/duplicate`가 담당한다. 특히 `updateForm`은 목록·상세가
 * 서버에서 오는 지금 **아무 화면에도 반영되지 않는 상태 변경**이었다 — 눌러도 아무 일도
 * 일어나지 않는데 토스트만 "마감했습니다"라고 말했다.
 *
 * 남은 `forms` 시드는 공개 폼(#11)·응답 화면(#13)이 아직 쓰고 있어 그 이슈들에서 걷어낸다.
 */

export const useFormStore = create<FormState>(() => ({
  forms: formSeed.data as unknown as Form[],
}));

/* ── 파생 ──────────────────────────────────────────────────── */

/**
 * 접수 상태 배지 표기 (ssccops-server #33).
 *
 * **`formSttsCd`가 아니라 `receiptStatus`로 그린다.** 접수 기간이 끝나도 서버는 상태를
 * 자동으로 CLOSED로 바꾸지 않으므로(배치 대신 표시 계층에서 구분하기로 한 결정),
 * `formSttsCd`로 배지를 고르면 이미 응답을 받지 않는 폼이 '접수중'이라고 말하게 된다.
 *
 * 그래서 `FORM_STTS_BADGE`는 지웠다 — 남겨 두면 다음 화면이 다시 그것으로 배지를 그려
 * 같은 괴리가 되살아난다. 목록 필터 칩처럼 **폼 상태 코드 자체**를 표기해야 하는 자리는
 * 기준 코드 사전의 `FORM_STTS_NM`을 쓴다.
 *
 * 'EXPIRED'만 amber인 것은 운영자가 손댈 여지가 있는 유일한 칸이기 때문이다 — 기간을
 * 늘리든 마감하든 결정이 필요하다. '접수 예정'과 '작성 중'은 아직 아무 일도 일어나지 않은
 * 상태라 강조하지 않는다.
 */
export const FORM_RECEIPT_BADGE: Record<
  FormReceiptStatus,
  { label: string; tone: "outline" | "blue" | "grey" | "amber" }
> = {
  DRAFT: { label: "작성중", tone: "outline" },
  SCHEDULED: { label: "접수 예정", tone: "outline" },
  ACCEPTING: { label: "접수중", tone: "blue" },
  EXPIRED: { label: "기간 종료", tone: "amber" },
  CLOSED: { label: "마감", tone: "grey" },
};
