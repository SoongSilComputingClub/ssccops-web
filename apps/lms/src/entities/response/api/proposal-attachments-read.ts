import { apiFetchAuthed } from "@/shared/api/authed-client";
import type { ProposalAttachmentList } from "../model/types";
import {
  myProposalAttachmentsPath,
  toProposalAttachmentList,
  type ProposalAttachmentListResponse,
} from "./proposal-attachment-mapping";

/*
 * 내 기획안의 첨부 목록 — 서버 컴포넌트 전용 (server#685 ·
 * `GET /v1/forms/{formId}/responses/mine/{formRspnsId}/attachments`).
 *
 * 기획안 상세(`/my/applications/[formRspnsId]`)의 첫 목록이다 — 이 앱은 조회를 서버에서 그린다
 * (lms AGENTS «조회는 서버 컴포넌트로»). 올리기·지우기 뒤의 다시 받기는 브라우저 통로
 * (`proposal-attachments.ts`)가 한다.
 *
 * **응답 상태와 무관하다** — 작성자는 반려된 기획안의 첨부도 본다. 남의 응답이면 상세와 같은
 * 404 `FORM_RESPONSE_NOT_FOUND`다.
 */
export async function fetchMyProposalAttachments(
  formId: number,
  formRspnsId: number,
): Promise<ProposalAttachmentList> {
  const res = await apiFetchAuthed<ProposalAttachmentListResponse>(
    myProposalAttachmentsPath(formId, formRspnsId),
  );
  return toProposalAttachmentList(res);
}
