import { PROPOSAL_SYS_FORM_CD } from "@/entities/form";
import { fetchSystemForm } from "@/entities/form/api/system-form";
import { ApiError } from "@/shared/api/client";

/*
 * 기획안 폼 식별자 조회 — 서버 컴포넌트 전용 (`fetchSystemForm` → `next/headers`).
 *
 * «낸 폼»과 «낸 기획안»을 가르는 열쇠는 기획안 폼의 `formId` 하나다(`model/responses.ts`의
 * `splitProposals`). 세 결과로 갈라 둔다 — 값이 있다 · 아직 시드되지 않았다(404) · 그 밖의
 * 실패. 뒤의 둘을 합치면 «기획안 폼이 없는 환경»에서 «낸 기획안»이 언제나 오류로 보인다.
 * 폼이 없으면 기획안도 없는 것이므로 그때는 빈 목록이 맞다.
 *
 * 서버 enum 이름은 `FORM_NOT_FOUND`지만 본문 코드는 `"NOT_FOUND"`다(`entities/form/api/public-form.ts`
 * 주석) — 상태 코드 404도 함께 본다.
 */
export type ProposalFormLookup =
  | { outcome: "found"; formId: number }
  | { outcome: "not-seeded" }
  | { outcome: "error" };

export async function lookupProposalForm(): Promise<ProposalFormLookup> {
  try {
    const form = await fetchSystemForm(PROPOSAL_SYS_FORM_CD);
    return { outcome: "found", formId: form.formId };
  } catch (error) {
    if (error instanceof ApiError && (error.code === "NOT_FOUND" || error.status === 404)) {
      return { outcome: "not-seeded" };
    }
    return { outcome: "error" };
  }
}

/** 조회 결과에서 formId만 — 모르면 null (`splitProposals`가 그때 전부 «낸 폼»에 남긴다) */
export function proposalFormIdOf(lookup: ProposalFormLookup): number | null {
  return lookup.outcome === "found" ? lookup.formId : null;
}
