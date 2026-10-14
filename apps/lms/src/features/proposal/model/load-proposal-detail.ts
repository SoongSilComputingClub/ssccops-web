import type {
  MyFormResponseDetail,
  ProposalAttachmentList,
  QitemCpstCn,
} from "@/entities/response";
import { RESPONSE_ERROR } from "@/entities/response";
// 서버 전용 조회는 배럴이 재export 하지 않는다 — 직접 임포트한다
import { fetchMyResponseDetail } from "@/entities/response/api/my-response-detail";
import { fetchMyProposalAttachments } from "@/entities/response/api/proposal-attachments-read";
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
 * 3. 첨부 자료 목록(server#685 · web#805) — 응답 행에 붙은 파일. 상세와 나란히 부른다.
 *
 * 폼 조회 뒤에 상세·첨부를 함께 부른다. 상세가 404 `FORM_RESPONSE_NOT_FOUND`(없는 응답 ·
 * 본인 것이 아닌 응답)면 "찾을 수 없음"으로 갈라 목록으로 돌려보낸다.
 *
 * **첨부 조회가 실패해도 상세는 그린다** — 낸 내용·검토 이력을 못 보는 것과 첨부 목록 하나를 못
 * 받은 것은 무게가 다르다. 그때 `attachments`는 null이고, 카드가 브라우저에서 한 번 더 받는다.
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
      /** 서버에서 받지 못했으면 null — 카드가 브라우저에서 다시 받는다 */
      attachments: ProposalAttachmentList | null;
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
    const [detail, attachments] = await Promise.all([
      fetchMyResponseDetail(form.formId, formRspnsId),
      fetchMyProposalAttachments(form.formId, formRspnsId).catch(() => null),
    ]);
    return {
      outcome: "ready",
      formId: form.formId,
      formTtlNm: form.formTtlNm,
      qitemCpstCn: form.qitemCpstCn,
      detail,
      attachments,
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
