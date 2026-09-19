/*
 * 운영 건(업무·하위 업무·회의) 첨부 (#546 · 서버 #493 · ssccops#410).
 *
 * 대상은 세 화면이 다 가진 `operationId` 하나다 — 서버가 첨부를 oper에 붙인다. 필드 이름은 서버
 * record 그대로.
 */

export interface AttachmentUploader {
  memberId: number;
  name: string;
}

export interface Attachment {
  fileId: number;
  fileName: string;
  fileSize: number | null;
  uploader: AttachmentUploader | null;
  uploadedAt: string | null;
}

/** 업로드 허가 — `contentType`은 서명에 들어 있어 PUT 헤더에 그대로 쓴다 */
export interface AttachmentTicket {
  fileId: number;
  uploadUrl: string;
  contentType: string;
  expiresInSeconds: number;
}

/** 서버 상한과 같은 값 — 왕복 없이 먼저 알린다(최종 판정은 서버 413) */
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
