import { apiFetch } from "@/shared/lib/api/client";
import type { ProposalAttachmentList } from "../model/types";

/*
 * 기획안 첨부 자료 — 검토자 (server#685 · web#805 · ssccops#607).
 *
 * `GET /v1/forms/{formId}/responses/{formRspnsId}/attachments`와 그 `…/{fileId}/download-url`.
 * 문턱은 응답 상세와 같은 `RESPONSE_REVIEW`다. 읽기만 한다 — 올리기·지우기는 작성자 본인(lms)의
 * 일이고 검토자에게는 경로가 없다. 목록·내려받기는 응답 상태와 무관하다.
 *
 * 내려받기는 운영 건 첨부(`entities/attachment`)와 같다 — 서명 URL을 JSON으로 받아 그 주소로
 * 간다. 인증 경로라 `<a href>`로는 Bearer를 못 붙이고, URL은 15분이면 만료되므로 누를 때마다 받는다.
 */

export const PROPOSAL_ATTACHMENT_ERROR = {
  /** 404 — 그 응답에 없는 fileId */
  NOT_FOUND: "PROPOSAL_ATTACHMENT_NOT_FOUND",
} as const;

interface ProposalAttachmentListResponse {
  attachments:
    | { fileId: number; fileName: string; fileSize: number; uploadedAt: string }[]
    | null;
  totalSize: number;
  maxTotalSize: number;
  maxCount: number;
}

function attachmentsPath(formId: number, formRspnsId: number): string {
  return `/v1/forms/${formId}/responses/${formRspnsId}/attachments`;
}

export async function fetchProposalAttachments(
  formId: number,
  formRspnsId: number,
): Promise<ProposalAttachmentList> {
  const res = await apiFetch<ProposalAttachmentListResponse>(attachmentsPath(formId, formRspnsId));
  return {
    attachments: (res.attachments ?? []).map((a) => ({
      fileId: a.fileId,
      fileName: a.fileName,
      fileSize: a.fileSize,
      uploadedAt: a.uploadedAt,
    })),
    totalSize: res.totalSize,
    maxTotalSize: res.maxTotalSize,
    maxCount: res.maxCount,
  };
}

export async function fetchProposalAttachmentDownloadUrl(
  formId: number,
  formRspnsId: number,
  fileId: number,
): Promise<string> {
  const res = await apiFetch<{ url: string; expiresInSeconds: number }>(
    `${attachmentsPath(formId, formRspnsId)}/${fileId}/download-url`,
  );
  return res.url;
}
