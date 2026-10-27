"use client";

import { apiFetchAuthedFromBrowser } from "@/shared/api/browser-client";
import { ApiError } from "@/shared/api/client";
import type { ProgramEventPost, ProgramEventPostSaveInput } from "../model/event-post";
import { EVENT_POST_IMAGE_ERROR } from "./error-codes";
import { toProgramEventPost, type ProgramEventPostApiResponse } from "./event-post-mapping";

/*
 * 소개 글 저장 · 이미지 발급 · R2 업로드 (#819 · ADR-0069 · 서버 #699) — **브라우저 전용**.
 *
 * 조회(`event-post-read.ts`)와 갈리는 것은 토큰을 어디서 꺼내는가 하나뿐이고 변환은
 * `event-post-mapping.ts`를 함께 쓴다.
 */

/**
 * PUT /v1/academic-programs/{id}/event-post — 네 칸(제목·본문·썸네일·장소)을 통째로 보낸다.
 *
 * 서버는 이 네 칸만 바꾸고 기간·정원·분류·신청 폼은 저장된 값을 그대로 둔다(ADR-0069). 그래서
 * 어드민 행사 저장처럼 행사 전체를 조립하지 않는다. 접수가 끝났거나 수료·폐지면 409
 * `ACADEMIC_PROGRAM_EVENT_POST_LOCKED`.
 */
export async function updateProgramEventPost(
  academicProgramId: number,
  input: ProgramEventPostSaveInput,
): Promise<ProgramEventPost> {
  const res = await apiFetchAuthedFromBrowser<ProgramEventPostApiResponse>(
    `/v1/academic-programs/${academicProgramId}/event-post`,
    { method: "PUT", body: JSON.stringify(input) },
  );
  return toProgramEventPost(res);
}

/** 서버 응답 — 어드민 `POST /v1/events/{eventId}/images`와 같은 모양이다 */
interface EventPostImageTicketResponse {
  uploadUrl: string;
  imageUrl: string;
  objectKey: string;
  expiresInSeconds: number;
  /** PUT에 그대로 실어야 하는 Content-Type — 서명에 포함돼 있다 */
  contentType: string;
}

/**
 * 한 번 쓰고 버리는 업로드 허가증. `uploadUrl`은 만료가 짧아 저장하지 않고, `imageUrl`은 만료가
 * 없는 우리 서버의 영구 주소라 본문·썸네일에 굳혀도 된다.
 */
export interface EventPostImageTicket {
  uploadUrl: string;
  imageUrl: string;
  contentType: string;
}

/**
 * POST /v1/academic-programs/{id}/event-post/images — presigned PUT 주소 발급.
 *
 * 키(`events/{eventId}/…`)와 공개 주소는 행사 이미지와 같고 발급 자격만 리더로 판정한다
 * (ADR-0069). 본문도 어드민과 같은 `{ fileExt, fileSize }`다 — 형식은 서버가 확장자로 정해
 * 응답 `contentType`에 싣는다(ssccops#157). 형식·용량을 여기서 먼저 판정하지 않는다.
 */
export async function issueEventPostImageTicket(
  academicProgramId: number,
  request: { fileExt: string; fileSize: number },
): Promise<EventPostImageTicket> {
  const res = await apiFetchAuthedFromBrowser<EventPostImageTicketResponse>(
    `/v1/academic-programs/${academicProgramId}/event-post/images`,
    { method: "POST", body: JSON.stringify(request) },
  );
  return { uploadUrl: res.uploadUrl, imageUrl: res.imageUrl, contentType: res.contentType };
}

/**
 * 발급받은 주소로 R2에 올린다 — `browser-client`를 타지 않는다(서명에 인증이 들어 있고, 본문이
 * 있으면 JSON `Content-Type`을 박아 서명과 갈린다). 헤더는 발급 응답의 `contentType` 그대로.
 */
export async function putEventPostImage(
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
    throw new ApiError(EVENT_POST_IMAGE_ERROR.PUT_FAILED, "이미지 저장소에 연결할 수 없습니다", 0);
  }
  if (!response.ok) {
    throw new ApiError(
      EVENT_POST_IMAGE_ERROR.PUT_FAILED,
      "이미지 저장소가 업로드를 거절했습니다",
      response.status,
    );
  }
}

/** 파일명에서 확장자만 뽑는다(점 뒤, 소문자). 못 뽑으면 빈 문자열 — 서버가 형식 오류로 판정한다 */
export function fileExtOf(file: File): string {
  const dot = file.name.lastIndexOf(".");
  return dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
}
