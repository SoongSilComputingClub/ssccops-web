import type { ProposalAttachmentList } from "../model/types";

/*
 * 기획안 첨부 목록 응답 → 도메인 (server#685 · web#805) — **순수 모듈**(전송 계층 무의존).
 *
 * 서버 컴포넌트의 첫 목록(`proposal-attachments-read.ts`)과 브라우저의 다시 받기
 * (`proposal-attachments.ts`)가 같은 변환을 쓴다. 필드 이름은 서버 record 그대로이고 값을 지어내지
 * 않는다 — 배열이 비어 오면 빈 배열일 뿐이다(`apiFetchList`가 `data: null`을 빈 배열로 읽는 것과
 * 같은 판단).
 */

export interface ProposalAttachmentResponse {
  fileId: number;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ProposalAttachmentListResponse {
  attachments: ProposalAttachmentResponse[] | null;
  totalSize: number;
  maxTotalSize: number;
  maxCount: number;
}

export function toProposalAttachmentList(
  res: ProposalAttachmentListResponse,
): ProposalAttachmentList {
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

/** 목록·발급·내려받기·지우기가 함께 쓰는 경로 — 대상은 언제나 인증 주체 본인의 응답이다 */
export function myProposalAttachmentsPath(formId: number, formRspnsId: number): string {
  return `/v1/forms/${formId}/responses/mine/${formRspnsId}/attachments`;
}
