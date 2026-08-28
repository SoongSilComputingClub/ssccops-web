import type { MyFormResponseDetail, QitemCpstCn } from "@/entities/response";
import { RESPONSE_ERROR } from "@/entities/response";
// 서버 전용 조회는 배럴이 재export 하지 않는다 — 직접 임포트한다
import { fetchMyResponseDetail } from "@/entities/response/api/my-response-detail";
import {
  fetchSystemForm,
  PROPOSAL_SYS_FORM_CD,
} from "@/entities/response/api/system-form";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { ApiError } from "@/shared/api/client";
import { loadProposalErrorMessage } from "./proposal-error";

/*
 * 기획안 한 건의 상세 화면 SSR 로더 (#171).
 *
 * ── 무엇을 모으는가 ────────────────────────────────────────
 * 1. 기획안 폼 — `formId`와 문항 구성(`qitemCpstCn`). 낸 내용을 문항 라벨과 맞춰 그리고,
 *    재제출 폼의 문항을 그리는 데 쓴다.
 * 2. 본인 응답 상세(서버 #177) — 이전 답 전체(`rspnsCn`)와 검토 이력. 프리필의 재료다.
 *
 * 두 조회는 서로 독립이라 함께 부른다. 상세가 404 `FORM_RESPONSE_NOT_FOUND`(없는 응답 ·
 * 본인 것이 아닌 응답)면 "찾을 수 없음"으로 갈라 목록으로 돌려보낸다.
 *
 * ── 폼을 언제 여는가는 뷰가 정한다 ──────────────────────────
 * 이 로더는 상태·답·이력·문항을 모아 줄 뿐이고, `CHANGES_REQUESTED`에서만 재제출 폼을
 * 마운트하는 판단은 `views/proposal-detail`이 한다(서버가 재제출을 `CHANGES_REQUESTED`
 * 에서만 받는다).
 */

export type ProposalDetailLoad =
  | {
      outcome: "ready";
      formId: number;
      formTtlNm: string;
      qitemCpstCn: QitemCpstCn;
      detail: MyFormResponseDetail;
    }
  /** 없는 응답 · 본인 것이 아닌 응답 */
  | { outcome: "not-found" }
  | { outcome: "not-seeded" }
  | { outcome: "unauthenticated" }
  | { outcome: "signup-required" }
  | { outcome: "error"; message: string };

export async function loadProposalDetail(
  formRspnsId: number,
): Promise<ProposalDetailLoad> {
  try {
    const form = await fetchSystemForm(PROPOSAL_SYS_FORM_CD);
    const detail = await fetchMyResponseDetail(form.formId, formRspnsId);
    return {
      outcome: "ready",
      formId: form.formId,
      formTtlNm: form.formTtlNm,
      qitemCpstCn: form.qitemCpstCn,
      detail,
    };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    if (error instanceof ApiError) {
      if (error.code === RESPONSE_ERROR.FORM_NOT_FOUND) {
        return { outcome: "not-seeded" };
      }
      if (error.code === RESPONSE_ERROR.FORM_RESPONSE_NOT_FOUND) {
        return { outcome: "not-found" };
      }
    }
    return { outcome: "error", message: loadProposalErrorMessage(error) };
  }
}
