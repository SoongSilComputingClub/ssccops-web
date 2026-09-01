import { ApiError, apiFetch } from "@/shared/lib/api/client";

/*
 * 행사 이미지 업로드 (ssccops#141 · 서버 ssccops-server#161).
 *
 * **서버는 파일 바이트를 다루지 않는다**(wave2 결정 D6). 서버가 하는 일은 서명된 PUT 주소를
 * 한 장 발급하는 것뿐이고, 실제 바이트는 웹이 R2로 직접 보낸다 — 서버 컨테이너 메모리로
 * 이미지가 흐르지 않게 한 것이라 웹이 편의상 서버로 우회 업로드하면 그 결정이 무너진다.
 *
 * 그래서 이 파일에는 성격이 다른 두 요청이 함께 있다.
 * - 발급 요청은 우리 서버로 나가므로 공통 `apiFetch`를 탄다(인증 헤더 · 응답 봉투 · 401/403 처리).
 * - 업로드 요청은 R2로 나가므로 **`apiFetch`를 태우지 않는다.** 서명에 인증이 이미 들어 있고,
 *   응답은 봉투가 아니며, Supabase 토큰을 남의 도메인으로 흘려보낼 이유도 없다.
 *
 * 읽기는 방향이 반대다. 버킷이 비공개가 되면서(ssccops#156) 이미지는 공개 도메인이 아니라
 * 우리 서버의 영구 주소로 읽는다 — 서버가 요청받을 때마다 짧은 서명 GET을 만들어 302로
 * 넘긴다. 바이트가 서버를 거치지 않는 것은 그대로이면서, 주소만 만료되지 않는다.
 */

/* ── 오류 코드 ─────────────────────────────────────────────── */

/** 이미지 업로드가 돌려주는 오류 코드 (서버와 합의된 계약 + R2 구간의 클라이언트 코드) */
export const EVENT_IMAGE_ERROR = {
  /** 400 — 서버가 허용하지 않는 형식. 허용 목록은 서버에만 있다(웹이 복제하지 않는다) */
  UNSUPPORTED_IMAGE_TYPE: "UNSUPPORTED_IMAGE_TYPE",
  /** 413 — 서버 용량 상한 초과. 상한값도 서버가 쥔다 */
  IMAGE_TOO_LARGE: "IMAGE_TOO_LARGE",
  /**
   * R2 구간의 실패 — 서버가 준 코드가 아니라 클라이언트가 붙인다(`CLIENT_*` 관례는
   * `shared/lib/api/client.ts`의 API_ERROR와 같다). 발급은 됐는데 바이트가 넘어가지 못한
   * 경우라, 원인이 우리 서버가 아님을 코드 이름이 남긴다.
   */
  PUT_FAILED: "CLIENT_IMAGE_PUT_FAILED",
} as const;

/* ── 발급 ──────────────────────────────────────────────────── */

interface EventImageTicketResponse {
  uploadUrl: string;
  imageUrl: string;
  objectKey: string;
  expiresInSeconds: number;
}

/**
 * 한 번 쓰고 버리는 업로드 허가증.
 *
 * `uploadUrl`은 만료가 짧다 — **저장하지 않는다.** 파일 하나에 한 장을 발급받아 바로 쓰고
 * 버리고, 재시도할 때는 다시 발급받는다(만료된 주소로 재시도하면 R2가 403으로 끊는다).
 *
 * 반대로 `imageUrl`은 **만료되지 않는다** — 본문 Markdown에 굳어도 되는 값이다. 이 허가증에서
 * 유일하게 오래 남는 것이 그것이다.
 */
export interface EventImageTicket {
  /** 웹이 한 번 PUT 할 서명 주소 */
  uploadUrl: string;
  /**
   * 본문·대표 이미지에 박아 넣을 읽기 주소 — 우리 서버의 영구 리다이렉트다.
   *
   * 버킷은 비공개라 이 주소로는 바이트가 바로 오지 않는다. 서버가 요청받은 그 자리에서
   * 짧은 서명 GET을 만들어 302로 넘긴다 — 서명이 요청마다 새로 생기므로 **저장된 이 주소는
   * 만료되지 않는다.** 저장해 둔 본문이 시간이 지나 깨지지 않는 근거가 이것이다.
   */
  imageUrl: string;
  /** 버킷 키 — 운영이 파일을 지목하는 수단이다 */
  objectKey: string;
  /**
   * `uploadUrl`의 서명 유효 시간(초) — 재시도가 가능한지 판단하는 근거다.
   * `imageUrl`의 수명과는 무관하다(그쪽은 만료가 없다).
   */
  expiresInSeconds: number;
}

/**
 * POST /v1/events/{eventId}/images — presigned PUT 주소 발급 (EVENT_MANAGE · 201).
 *
 * `eventId`가 경로에 있으므로 **아직 저장하지 않은 행사에는 발급받을 수 없다** — 등록 화면이
 * 첨부를 잠그는 이유가 이것이다.
 *
 * 응답의 `imageUrl`을 그대로 쓴다. 주소의 도메인도 경로 규칙도 환경(dev·prod)마다 다르고
 * 서버만 알고 있다 — 웹이 `objectKey`로 주소를 조립하면 주소 사전이 두 벌이 되어 한쪽만
 * 바뀌는 날 본문의 이미지가 통째로 깨진다.
 */
export async function issueEventImageTicket(
  eventId: number,
  request: { fileName: string; contentType: string; fileSize: number },
): Promise<EventImageTicket> {
  const res = await apiFetch<EventImageTicketResponse>(`/v1/events/${eventId}/images`, {
    method: "POST",
    body: JSON.stringify(request),
  });

  return {
    uploadUrl: res.uploadUrl,
    imageUrl: res.imageUrl,
    objectKey: res.objectKey,
    expiresInSeconds: res.expiresInSeconds,
  };
}

/* ── R2 직접 업로드 ────────────────────────────────────────── */

/**
 * 발급받은 주소로 R2에 파일을 올린다 (PUT 한 번).
 *
 * `Content-Type`은 **발급 요청에 실었던 값과 같아야 한다** — 서명에 포함된 헤더라 다른 값을
 * 보내면 R2가 서명 불일치로 거절한다. 그래서 파일에서 다시 읽지 않고 인자로 받는다.
 *
 * 실패는 `ApiError`로 통일한다 — 화면은 발급 실패와 업로드 실패를 같은 자리에서 문구로
 * 옮기고, 코드로만 원인을 가른다(응답 본문은 R2의 XML이라 사용자에게 보일 것이 없다).
 */
export async function putEventImage(
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
    /* 네트워크·CORS·만료 전 끊김 — 서버가 준 코드가 아니므로 클라이언트 코드를 붙인다 */
    throw new ApiError(
      EVENT_IMAGE_ERROR.PUT_FAILED,
      "이미지 저장소에 연결할 수 없습니다",
      0,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      EVENT_IMAGE_ERROR.PUT_FAILED,
      "이미지 저장소가 업로드를 거절했습니다",
      response.status,
    );
  }
}
