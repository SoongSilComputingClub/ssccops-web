"use client";

import { apiFetchAuthedFromBrowser } from "@/shared/api/browser-client";
import { ApiError } from "@/shared/api/client";

/*
 * 출석 인증사진 업로드 (#128 · ssccops-server#137 · POST .../sessions/{id}/file-reference → R2 PUT).
 *
 * **서버는 파일 바이트를 다루지 않는다**(wave2 결정 · 행사 이미지 #161이 세운 패턴). 서버가
 * 하는 일은 서명된 PUT 주소 한 장을 발급하는 것뿐이고, 실제 바이트는 브라우저가 R2로 직접
 * 보낸다 — 512MB 컨테이너로 이미지가 흐르지 않게 한 것이라 편의상 서버로 우회하면 그 결정이
 * 무너진다.
 *
 * 그래서 이 파일에는 성격이 다른 두 요청이 함께 있다.
 * - 발급 요청은 우리 서버로 나가므로 `apiFetchAuthedFromBrowser`를 탄다(인증 헤더 · 응답 봉투).
 * - 업로드 요청은 R2로 나가므로 **`apiFetch`를 태우지 않는다.** 서명에 인증이 들어 있고,
 *   응답은 봉투가 아니며, Supabase 토큰을 남의 도메인으로 흘려보낼 이유도 없다.
 *
 * ── sessionId가 먼저 있어야 한다 ─────────────────────────────
 * 발급 경로가 `.../sessions/{sessionId}/file-reference`라 **회차 행이 없으면 404다**(서버
 * `SessionCorrectionPolicy.requireCorrectable`). 신규 제출(`NOT_SUBMITTED`)에는 아직 `sessionId`가
 * 없으므로, 오케스트레이션 훅은 회차 기록을 먼저 제출해 `sessionId`를 받은 뒤 사진을 올린다
 * (`use-submit-session.ts` 주석). 재업로드는 UPSERT라 실패한 PUT을 같은 요청 한 번으로 다시
 * 시도할 수 있다.
 */

/** 인증사진 업로드가 돌려주는 오류 코드 (서버 계약 + R2 구간의 클라이언트 코드). */
export const SESSION_PHOTO_ERROR = {
  /** 400 — 서버가 허용하지 않는 형식. 허용 목록은 서버에만 있다(웹이 복제하지 않는다) */
  UNSUPPORTED_IMAGE_TYPE: "UNSUPPORTED_IMAGE_TYPE",
  /** 409 — 승인 완료된 회차의 사진을 바꾸려 함 */
  SESSION_NOT_EDITABLE: "SESSION_NOT_EDITABLE",
  /** 404 — 회차 행이 없거나 다른 활동의 회차 */
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  /** 403 — 스터디장 본인이 아님 */
  FORBIDDEN: "FORBIDDEN",
  /**
   * R2 구간의 실패 — 서버가 준 코드가 아니라 클라이언트가 붙인다(`CLIENT_*` 관례는
   * `shared/api/client.ts`의 `API_ERROR`와 같다). 발급은 됐는데 바이트가 넘어가지 못한
   * 경우라, 원인이 우리 서버가 아님을 코드 이름이 남긴다.
   */
  PUT_FAILED: "CLIENT_PHOTO_PUT_FAILED",
} as const;

/* ── 발급 ──────────────────────────────────────────────────── */

interface FileReferenceUploadResponse {
  fileReferenceId: number;
  uploadUrl: string;
  publicUrl: string;
  /** 이 PUT에 **반드시 실어야 하는** Content-Type 헤더 값 — 서명에 포함돼 있다 */
  contentType: string;
}

/** 한 번 쓰고 버리는 업로드 허가증 — `uploadUrl`은 만료가 짧으므로 저장하지 않는다 */
export interface SessionPhotoTicket {
  fileReferenceId: number;
  uploadUrl: string;
  /** 저장된 `file_url_addr` 그대로 — 화면이 `<img src>`에 넣는 문자열 */
  publicUrl: string;
  contentType: string;
}

/**
 * POST /v1/academic-programs/{id}/sessions/{sessionId}/file-reference — presigned PUT 주소 발급
 * (소유권 · 201, 재발급도 201 · UPSERT).
 *
 * 받는 것은 확장자 하나뿐이다(계약). `.JPG`로 보내든 `jpg`로 보내든 서버가 정규화한다 —
 * 파일에서 뽑은 확장자를 그대로 넘긴다.
 */
export async function issueSessionPhotoTicket(
  academicProgramId: number,
  sessionId: number,
  fileExt: string,
): Promise<SessionPhotoTicket> {
  const res = await apiFetchAuthedFromBrowser<FileReferenceUploadResponse>(
    `/v1/academic-programs/${academicProgramId}/sessions/${sessionId}/file-reference`,
    { method: "POST", body: JSON.stringify({ fileExt }) },
  );
  return {
    fileReferenceId: res.fileReferenceId,
    uploadUrl: res.uploadUrl,
    publicUrl: res.publicUrl,
    contentType: res.contentType,
  };
}

/* ── R2 직접 업로드 ────────────────────────────────────────── */

/**
 * 발급받은 주소로 R2에 사진을 올린다 (PUT 한 번).
 *
 * `Content-Type`은 **발급 응답의 `contentType`과 같아야 한다** — 서명에 포함된 헤더라 다른
 * 값을 보내면 R2가 서명 불일치로 거절한다. 그래서 파일에서 다시 읽지 않고 인자로 받는다.
 *
 * 실패는 `ApiError`로 통일한다 — 화면은 발급 실패와 업로드 실패를 같은 자리에서 문구로
 * 옮기고, 코드로만 원인을 가른다(응답 본문은 R2의 XML이라 사용자에게 보일 것이 없다).
 */
export async function putSessionPhoto(
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
    throw new ApiError(
      SESSION_PHOTO_ERROR.PUT_FAILED,
      "사진 저장소에 연결할 수 없습니다",
      0,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      SESSION_PHOTO_ERROR.PUT_FAILED,
      "사진 저장소가 업로드를 거절했습니다",
      response.status,
    );
  }
}

/** 파일명에서 확장자만 뽑는다(점 뒤, 소문자). 못 뽑으면 빈 문자열 — 서버가 형식 오류로 판정하게 둔다 */
export function fileExtOf(file: File): string {
  const dot = file.name.lastIndexOf(".");
  return dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
}
