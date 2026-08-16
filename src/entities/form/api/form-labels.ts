import { apiFetch } from "@/shared/lib/api/client";
import type { FormLabelSummary } from "../model/types";

/*
 * 폼_라벨 API (ssccops-server #34).
 *
 * 라벨 목록은 **폼 목록의 필터 후보 · 편집기의 라벨 칩 · 라벨 관리 화면**이 함께 쓴다.
 * 화면마다 각자 호출을 만들면 쿼리 파라미터 해석이 갈라지므로(특히 useYn 기본값) 라벨 호출은
 * 이 파일 하나로 모은다.
 *
 * ── `PUT /v1/forms/{formId}/labels`가 여기 없는 이유 ──────────────
 * 서버 계약에는 폼의 라벨 지정을 통째로 교체하는 이 엔드포인트가 있지만 **웹은 쓰지 않는다.**
 * 라벨 지정은 폼 저장 본문의 `labelIds`로만 나간다(#8 · #10 합의). 서버도 두 경로를 같은
 * 진입점(`replaceFormLabels`)으로 합쳤으므로 규칙은 하나다 — 그런데 자동 저장이 붙은 편집
 * 화면에서 저장과 지정을 각각 부르면 두 요청의 도착 순서에 따라 방금 끈 라벨이 되살아난다.
 * 편집기 외에 라벨만 따로 바꾸는 화면이 생기면 그때 이 파일에 추가한다.
 */

/** 라벨 API가 돌려주는 오류 코드 (ssccops-server FormErrorCode) */
export const FORM_LABEL_ERROR = {
  /** 라벨_명 누락·50자 초과 */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 같은 이름의 라벨이 이미 있다 */
  FORM_LABEL_NAME_DUPLICATED: "FORM_LABEL_NAME_DUPLICATED",
  /** 없는 라벨 — 목록을 다시 불러와야 한다 */
  FORM_LABEL_NOT_FOUND: "FORM_LABEL_NOT_FOUND",
  /** 비활성 라벨을 **새로** 지정하려 했다. 이미 지정돼 있던 것을 그대로 다시 보내는 것은 통과한다 */
  FORM_LABEL_NOT_USABLE: "FORM_LABEL_NOT_USABLE",
} as const;

/** 라벨_명 최대 길이 (form_lbl.lbl_nm 명V50) — 서버 400을 기다리지 않고 먼저 걸러 준다 */
export const LBL_NM_MAX_LENGTH = 50;

interface FormLabelResponse {
  formLblId: number;
  lblNm: string;
  useYn: boolean;
  usageCount: number | null;
  crtDt: string;
  mdfcnDt: string;
}

function toFormLabel(res: FormLabelResponse): FormLabelSummary {
  return {
    formLblId: res.formLblId,
    lblNm: res.lblNm,
    useYn: res.useYn,
    usageCount: res.usageCount ?? 0,
    crtDt: res.crtDt,
    mdfcnDt: res.mdfcnDt,
  };
}

/**
 * GET /v1/form-labels — 라벨 목록.
 *
 * `useYn`을 주지 않으면 비활성 라벨까지 전부 온다. 필터·편집기처럼 "새로 고를 수 있는 라벨"만
 * 필요한 곳은 반드시 `true`를 넘긴다 — 라벨은 삭제가 아니라 비활성화라서, 안 거르면 이제
 * 쓰지 않기로 한 라벨이 계속 후보로 남는다.
 */
export async function fetchFormLabels(useYn?: boolean): Promise<FormLabelSummary[]> {
  const qs = useYn === undefined ? "" : `?useYn=${useYn}`;
  const labels = await apiFetch<FormLabelResponse[] | null>(`/v1/form-labels${qs}`);
  return (labels ?? []).map(toFormLabel);
}

/**
 * POST /v1/form-labels — 라벨 추가. 최고운영자 전용이지만 역할 인가(#9)가 아직 없어
 * 서버는 인증만 확인한다. 나중에 403이 오기 시작해도 화면이 안내할 수 있게 호출부에서 다룬다.
 *
 * 응답 본문을 쓰지 않는다. 관리 화면은 추가 직후 목록을 다시 부르는데(`usageCount`는 서버
 * 집계이고 정렬 순서도 서버가 정한다) 응답의 한 행을 배열에 끼워 넣으면 그 두 규칙을 웹이
 * 흉내 내게 된다 — 성공 여부만 보고 목록은 서버에서 다시 받는다.
 */
export async function createFormLabel(lblNm: string): Promise<void> {
  await apiFetch<FormLabelResponse | null>("/v1/form-labels", {
    method: "POST",
    body: JSON.stringify({ lblNm: lblNm.trim() }),
  });
}

/**
 * PATCH /v1/form-labels/{formLblId} — 사용_여부 토글.
 *
 * **삭제가 아니라 비활성화다.** `useYn=false`가 되면 신규 지정 후보와 필터에서만 빠지고,
 * 이미 그 라벨이 걸린 폼의 지정은 그대로 남는다 — 과거 폼의 분류 이력을 지우지 않기 위함이다.
 */
export async function setFormLabelUse(formLblId: number, useYn: boolean): Promise<void> {
  await apiFetch<FormLabelResponse | null>(`/v1/form-labels/${formLblId}`, {
    method: "PATCH",
    body: JSON.stringify({ useYn }),
  });
}
