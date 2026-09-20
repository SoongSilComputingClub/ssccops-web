import { ATTACHMENT_ERROR, ATTACHMENT_PUT_FAILED } from "@/entities/attachment";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/** `ApiError.code` → 화면 문구 (#546). 한 줄 · 원인 — 행동 */
export function toAttachmentErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "첨부 파일을 처리하지 못했습니다. 잠시 후 다시 시도해주세요";
  }
  switch (error.code) {
    case ATTACHMENT_ERROR.UNSUPPORTED_TYPE:
      return "첨부할 수 없는 형식입니다 — 문서·표·발표·압축·이미지 파일만 됩니다";
    case ATTACHMENT_ERROR.TOO_LARGE:
      return "파일이 25MB를 넘습니다 — 크기를 줄여 다시 올려주세요";
    case ATTACHMENT_PUT_FAILED:
      return "파일을 올리지 못했습니다 — 잠시 후 다시 시도해주세요";
    case ATTACHMENT_ERROR.NOT_FOUND:
      return "첨부 파일이 없습니다 — 새로고침해주세요";
    case ATTACHMENT_ERROR.OPERATION_NOT_FOUND:
      return "운영 건이 없습니다 — 목록을 새로고침해주세요";
    case "FORBIDDEN":
      return "첨부를 다룰 권한이 없습니다";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다 — 잠시 후 다시 시도해주세요";
    default:
      return error.message || "첨부 파일을 처리하지 못했습니다. 잠시 후 다시 시도해주세요";
  }
}
