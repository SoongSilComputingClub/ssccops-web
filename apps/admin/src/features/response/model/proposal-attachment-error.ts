import { PROPOSAL_ATTACHMENT_ERROR, RESPONSE_ERROR } from "@/entities/response";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 기획안 첨부 자료(검토자) 실패 → 한 줄 (web#805 · server#685).
 *
 * 401·403 `SIGNUP_REQUIRED`는 `apiFetch`가 리다이렉트까지 끝낸다. 권한 문구는 응답 심사 화면과
 * 같은 이름으로 부른다 — 첨부 경로의 문턱이 응답 상세와 같은 `RESPONSE_REVIEW`다.
 */
export function proposalAttachmentErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "첨부 자료를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }
  switch (error.code) {
    case PROPOSAL_ATTACHMENT_ERROR.NOT_FOUND:
      return "첨부 파일이 없습니다 — 새로고침해주세요";
    case RESPONSE_ERROR.FORM_RESPONSE_NOT_FOUND:
      return "기획안이 없습니다 — 목록을 새로고침해주세요";
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "첨부 자료를 볼 권한이 없습니다 — 응답 심사(RESPONSE_REVIEW) 권한이 필요합니다";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message || "첨부 자료를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }
}
