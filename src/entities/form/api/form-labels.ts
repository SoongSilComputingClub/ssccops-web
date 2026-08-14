import { apiFetch } from "@/shared/lib/api/client";
import type { FormLabelSummary } from "../model/types";

/*
 * 폼_라벨 조회 API (ssccops-server #34).
 *
 * 라벨 목록은 **폼 목록의 필터 후보 · 편집기의 라벨 칩 · 라벨 관리 화면**이 함께 쓴다.
 * 화면마다 각자 호출을 만들면 쿼리 파라미터 해석이 갈라지므로(특히 useYn 기본값) 조회
 * 함수는 이 파일 하나로 둔다 — 라벨 추가·토글·지정(#10)도 여기에 붙인다.
 */

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
