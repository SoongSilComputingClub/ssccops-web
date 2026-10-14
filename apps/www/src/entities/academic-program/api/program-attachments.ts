"use client";

import { apiFetchAuthedFromBrowser } from "@/shared/api/browser-client";
import type { ProposalAttachmentList } from "../model/types";

/*
 * 학술 프로그램의 첨부 자료 — 로그인한 회원 (server#685 · web#805 · 브라우저 전용).
 *
 * `GET /v1/academic-programs/{academicProgramId}/attachments` — 그 프로그램이 태어난 기획안 응답의
 * 첨부다. 문턱은 `GET /v1/academic-programs/{id}`와 같다(인증 + 회원 행). **이 앱이 학술 프로그램
 * 단건 경로를 부르는 첫 자리다** — 그래서 이 슬라이스에 붙였다.
 *
 * ── 왜 브라우저 통로인가 ────────────────────────────────────
 * 행사 상세는 익명 SSR이다(OG · wave2 D7). 서버 컴포넌트에서 세션을 읽으면 익명 공개 렌더마다
 * 세션 왕복이 붙고 CDN 캐시도 걸 수 없다(«홈은 세션을 보지 않는다»와 같은 판단). 신청 버튼 자리
 * (`apply-actions.tsx`)처럼 첨부 절만 클라이언트로 떼어 내 브라우저 토큰으로 묻는다. 토큰이 없으면
 * `browser-client`가 요청 없이 `CLIENT_UNAUTHENTICATED`를 던지고, 화면은 절을 그리지 않는다 —
 * **익명에게는 첨부가 있는지조차 알리지 않는다**(ADR-0038 · ssccops#607).
 *
 * 내려받기는 누를 때마다 서명 URL(15분)을 받아 그 주소로 간다 — 목록에 박아 두지 않는다.
 */

/** 화면이 가르는 서버 오류 코드 — 나머지는 서버 문장을 그대로 보인다 */
export const PROGRAM_ATTACHMENT_ERROR = {
  /** 404 — 그 프로그램의 원 기획안에 없는 fileId */
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

function attachmentsPath(academicProgramId: number): string {
  return `/v1/academic-programs/${academicProgramId}/attachments`;
}

export async function fetchProgramAttachments(
  academicProgramId: number,
): Promise<ProposalAttachmentList> {
  const res = await apiFetchAuthedFromBrowser<ProposalAttachmentListResponse>(
    attachmentsPath(academicProgramId),
  );
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

export async function fetchProgramAttachmentDownloadUrl(
  academicProgramId: number,
  fileId: number,
): Promise<string> {
  const res = await apiFetchAuthedFromBrowser<{ url: string; expiresInSeconds: number }>(
    `${attachmentsPath(academicProgramId)}/${fileId}/download-url`,
  );
  return res.url;
}
