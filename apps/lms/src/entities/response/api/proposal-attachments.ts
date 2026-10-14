"use client";

import {
  apiFetchAuthedFromBrowser,
  apiFetchAuthedNullableFromBrowser,
} from "@/shared/api/browser-client";
import { ApiError } from "@/shared/api/client";
import type { ProposalAttachmentList, ProposalAttachmentTicket } from "../model/types";
import { PROPOSAL_ATTACHMENT_ERROR } from "./error-codes";
import {
  myProposalAttachmentsPath,
  toProposalAttachmentList,
  type ProposalAttachmentListResponse,
} from "./proposal-attachment-mapping";

/*
 * 기획안 첨부 자료 — 작성자 본인 (server#685 · web#805 · 브라우저 전용).
 *
 * 흐름은 출석 인증사진(`entities/academic-session/api/file-reference.ts`)·어드민 운영 건 첨부와
 * 같다: 발급(참조 행이 생긴다) → 브라우저가 R2에 직접 PUT → 실패하면 발급받은 `fileId`를 DELETE로
 * 치운다(서버는 PUT을 관측하지 않아 안 치우면 빈 항목이 목록에 남는다). **서버는 바이트를 받지
 * 않는다** — multipart 헬퍼를 두지 않는 이유다.
 *
 * - 발급·목록·내려받기·지우기는 우리 서버로 나가므로 `browser-client`(인증 헤더 · 봉투)를 탄다.
 * - **PUT은 `browser-client`를 태우지 않는다** — 그쪽은 본문이 있으면 `Content-Type:
 *   application/json`을 박는데, 서명에 든 `Content-Type`과 다르면 R2가 거절한다. 토큰을 남의
 *   도메인으로 보낼 이유도 없다.
 *
 * 올리기·지우기는 작성 중(접수 중인 폼)·수정요청 상태에서만 서버가 받는다(409 `…_LOCKED`). 목록·
 * 내려받기는 상태와 무관하다.
 */

/** GET …/attachments — 다시 받기(올리기·지우기 뒤 · 신규 작성의 첫 목록) */
export async function fetchProposalAttachments(
  formId: number,
  formRspnsId: number,
): Promise<ProposalAttachmentList> {
  const res = await apiFetchAuthedFromBrowser<ProposalAttachmentListResponse>(
    myProposalAttachmentsPath(formId, formRspnsId),
  );
  return toProposalAttachmentList(res);
}

/**
 * POST …/attachments — 업로드 허가 발급(201).
 *
 * `fileSize`는 **실제로 PUT 할 그 파일의 크기**여야 한다 — 서명의 `Content-Length`가 되어 R2가
 * 다른 크기를 거절한다. 형식·총량·개수는 여기서 서버가 판정한다(화면은 미리 보지 않는다).
 */
export async function issueProposalAttachment(
  formId: number,
  formRspnsId: number,
  request: { fileName: string; fileSize: number },
): Promise<ProposalAttachmentTicket> {
  return apiFetchAuthedFromBrowser<ProposalAttachmentTicket>(
    myProposalAttachmentsPath(formId, formRspnsId),
    { method: "POST", body: JSON.stringify(request) },
  );
}

/** 발급받은 주소로 R2에 파일을 올린다 — 실패는 `ApiError`(`CLIENT_…_PUT_FAILED`)로 통일한다 */
export async function putProposalAttachment(
  uploadUrl: string,
  file: File,
  contentType: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": contentType },
    });
  } catch {
    throw new ApiError(PROPOSAL_ATTACHMENT_ERROR.PUT_FAILED, "파일 저장소에 연결할 수 없습니다", 0);
  }
  if (!response.ok) {
    throw new ApiError(
      PROPOSAL_ATTACHMENT_ERROR.PUT_FAILED,
      "파일 저장소가 업로드를 거절했습니다",
      response.status,
    );
  }
}

/**
 * GET …/attachments/{fileId}/download-url — 15분 서명 GET 주소.
 *
 * 누를 때마다 새로 받는다 — 목록에 박아 두면 페이지를 오래 열어 둔 사람이 죽은 링크를 누른다.
 * 서명에 `Content-Disposition: attachment`와 원본 이름이 들어 있어 화면이 이름을 짓지 않는다.
 */
export async function fetchProposalAttachmentDownloadUrl(
  formId: number,
  formRspnsId: number,
  fileId: number,
): Promise<string> {
  const res = await apiFetchAuthedFromBrowser<{ url: string; expiresInSeconds: number }>(
    `${myProposalAttachmentsPath(formId, formRspnsId)}/${fileId}/download-url`,
  );
  return res.url;
}

/** DELETE …/attachments/{fileId} — `data: null`인 200이라 nullable 통로를 탄다 */
export async function deleteProposalAttachment(
  formId: number,
  formRspnsId: number,
  fileId: number,
): Promise<void> {
  await apiFetchAuthedNullableFromBrowser<null>(
    `${myProposalAttachmentsPath(formId, formRspnsId)}/${fileId}`,
    { method: "DELETE" },
  );
}
