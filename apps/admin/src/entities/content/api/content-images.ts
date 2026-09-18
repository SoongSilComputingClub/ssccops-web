import { ApiError, apiFetch } from "@/shared/lib/api/client";

/*
 * 포스트 갤러리 이미지 (#521 · 서버 ssccops-server#480).
 *
 * 흐름은 행사 이미지(entities/event/api/event-images.ts)와 같다 — 서버는 서명된 PUT 주소를
 * 발급하고 바이트는 웹이 R2로 직접 보낸다(wave2 D6). **다른 점 둘**:
 * - 발급 응답에 `fileId`가 있다. 서버가 `file_rfrnc` 행을 함께 만들어 이 포스트의 갤러리에
 *   붙이므로, 발급받은 순간 갤러리에 한 장이 생긴 것이다 — 업로드 완료 확인 API는 없다(서버가
 *   기각). PUT이 실패하면 갤러리에 빈 장이 남으므로 화면이 곧바로 DELETE로 치운다.
 * - 삭제 API가 있다. 표지였으면 서버가 표지도 비운다.
 *
 * 발급은 `apiFetch`, 업로드는 맨 `fetch` — 나뉘는 이유는 event-images.ts 머리 주석.
 */

/* ── 오류 코드 ─────────────────────────────────────────────── */

/** R2 구간의 실패 — 서버 코드가 아니라 클라이언트가 붙인다(`CLIENT_*` 관례) */
export const CONTENT_IMAGE_PUT_FAILED = "CLIENT_IMAGE_PUT_FAILED";

/* ── 발급 ──────────────────────────────────────────────────── */

interface ContentImageUploadResponse {
  fileId: number;
  uploadUrl: string;
  imageUrl: string;
  objectKey: string;
  contentType: string;
  expiresInSeconds: number;
}

/**
 * 한 번 쓰고 버리는 업로드 허가증 + 갤러리에 새로 생긴 장의 식별자.
 *
 * `uploadUrl`은 만료가 짧다 — 저장하지 않고 바로 쓴다. `imageUrl`은 서버의 영구 리다이렉트라
 * 본문에 굳혀도 된다. `contentType`은 PUT 헤더에 **그대로** 싣는다(서명에 포함).
 */
export interface ContentImageTicket {
  fileId: number;
  uploadUrl: string;
  imageUrl: string;
  objectKey: string;
  contentType: string;
  expiresInSeconds: number;
}

/**
 * POST /v1/content/posts/{postId}/images — presigned PUT 발급 (201).
 *
 * 보내는 것은 확장자와 크기뿐이다(행사와 같다 · png/jpg/webp/gif · 10MB 이하). 형식은 서버가
 * 확장자로 정해 `contentType`으로 돌려준다. 축소한 파일을 올리므로 확장자·크기는 **축소 뒤의
 * 값**을 보낸다 — 원본 크기를 보내면 서명과 실제 바이트가 어긋난다.
 */
export async function issueContentImageTicket(
  postId: number,
  request: { fileExt: string; fileSize: number },
): Promise<ContentImageTicket> {
  const res = await apiFetch<ContentImageUploadResponse>(`/v1/content/posts/${postId}/images`, {
    method: "POST",
    body: JSON.stringify(request),
  });
  return {
    fileId: res.fileId,
    uploadUrl: res.uploadUrl,
    imageUrl: res.imageUrl,
    objectKey: res.objectKey,
    contentType: res.contentType,
    expiresInSeconds: res.expiresInSeconds,
  };
}

/* ── R2 직접 업로드 ────────────────────────────────────────── */

/**
 * 발급받은 주소로 바이트를 올린다 (PUT 한 번). `Content-Type`은 발급 응답의 값과 같아야 한다.
 * 실패는 `ApiError`로 통일한다 — 응답 본문은 R2의 XML이라 사용자에게 보일 것이 없다.
 */
export async function putContentImage(
  uploadUrl: string,
  body: Blob,
  contentType: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      body,
      headers: { "Content-Type": contentType },
    });
  } catch {
    throw new ApiError(CONTENT_IMAGE_PUT_FAILED, "이미지 저장소에 연결할 수 없습니다", 0);
  }

  if (!response.ok) {
    throw new ApiError(
      CONTENT_IMAGE_PUT_FAILED,
      "이미지 저장소가 업로드를 거절했습니다",
      response.status,
    );
  }
}

/* ── 삭제 ──────────────────────────────────────────────────── */

/**
 * DELETE /v1/content/posts/{postId}/images/{fileId} — 갤러리에서 한 장을 지운다 (200 봉투).
 *
 * 표지였으면 서버가 표지를 비운다 — 화면은 응답으로 부분 갱신하지 않고 포스트를 다시 부른다
 * (표지·갤러리 두 값이 함께 움직인다). 오브젝트는 서버가 커밋 뒤에 지운다.
 */
export async function deleteContentImage(postId: number, fileId: number): Promise<void> {
  await apiFetch<void>(`/v1/content/posts/${postId}/images/${fileId}`, { method: "DELETE" });
}
