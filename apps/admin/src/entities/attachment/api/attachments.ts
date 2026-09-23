import { ApiError, apiFetch } from "@/shared/lib/api/client";
import type { Attachment, AttachmentTicket } from "../model/types";

/*
 * `/v1/operations/{operationId}/attachments` (서버 #493).
 *
 * 흐름은 콘텐츠 갤러리와 같다 — 발급(참조 행이 생긴다) → 브라우저가 R2에 PUT → 실패하면 발급받은
 * fileId를 DELETE로 치운다(서버는 PUT을 관측하지 않는다). 내려받기는 서명 URL을 JSON으로 받아 그
 * 주소로 간다 — 인증 경로라 <a href>로는 헤더를 못 붙인다.
 */

export const ATTACHMENT_ERROR = {
  NOT_FOUND: "ATTACHMENT_NOT_FOUND",
  UNSUPPORTED_TYPE: "UNSUPPORTED_ATTACHMENT_TYPE",
  TOO_LARGE: "ATTACHMENT_TOO_LARGE",
  OPERATION_NOT_FOUND: "NOT_FOUND",
} as const;

/** 브라우저 → R2 PUT 실패 — 서버 코드가 아니라 화면이 만든 코드 */
export const ATTACHMENT_PUT_FAILED = "CLIENT_ATTACHMENT_PUT_FAILED";

interface AttachmentResponse {
  fileId: number;
  fileName: string | null;
  fileSize: number | null;
  uploader: { memberId: number | null; name: string | null } | null;
  uploadedAt: string | null;
}

function toAttachment(res: AttachmentResponse): Attachment {
  return {
    fileId: res.fileId,
    fileName: res.fileName ?? "",
    fileSize: res.fileSize,
    uploader:
      res.uploader?.memberId != null
        ? { memberId: res.uploader.memberId, name: res.uploader.name ?? "" }
        : null,
    uploadedAt: res.uploadedAt,
  };
}

export async function fetchAttachments(operationId: number): Promise<Attachment[]> {
  const rows = await apiFetch<AttachmentResponse[] | null>(
    `/v1/operations/${operationId}/attachments`,
  );
  return (rows ?? []).map(toAttachment);
}

export async function issueAttachmentTicket(
  operationId: number,
  request: { fileName: string; fileSize: number },
): Promise<AttachmentTicket> {
  return apiFetch<AttachmentTicket>(`/v1/operations/${operationId}/attachments`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function putAttachment(
  uploadUrl: string,
  body: Blob,
  contentType: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(uploadUrl, { method: "PUT", body, headers: { "Content-Type": contentType } });
  } catch {
    throw new ApiError(ATTACHMENT_PUT_FAILED, "파일 저장소에 연결할 수 없습니다", 0);
  }
  if (!response.ok) {
    throw new ApiError(ATTACHMENT_PUT_FAILED, "파일 저장소가 업로드를 거절했습니다", response.status);
  }
}

export async function fetchAttachmentDownloadUrl(
  operationId: number,
  fileId: number,
): Promise<string> {
  const res = await apiFetch<{ url: string; expiresInSeconds: number }>(
    `/v1/operations/${operationId}/attachments/${fileId}/download-url`,
  );
  return res.url;
}

export async function deleteAttachment(operationId: number, fileId: number): Promise<void> {
  await apiFetch<null>(`/v1/operations/${operationId}/attachments/${fileId}`, { method: "DELETE" });
}
