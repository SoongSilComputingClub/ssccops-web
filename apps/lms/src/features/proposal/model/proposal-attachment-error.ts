import { PROPOSAL_ATTACHMENT_ERROR, RESPONSE_ERROR } from "@/entities/response";
import { AUTH_ERROR } from "@/shared/api/auth-error";
import { API_ERROR, ApiError } from "@/shared/api/client";
import { PROPOSAL_RESPONSE_NOT_FOUND } from "./proposal-error";

/*
 * 기획안 첨부 자료 실패 → 한 줄 (web#805 · server#685 · AGENTS «화면 문구»).
 *
 * ── 형식·총량·개수·잠김은 서버 문장 그대로 ───────────────────
 * 판정이 서버에만 있고(lms AGENTS — 웹은 파일 형식·크기를 검사하지 않는다), 총량 초과(413)는 남은
 * 용량을 문장에 실어 보낸다. 화면이 문구를 갈아 끼우면 그 숫자가 사라지고, 서버가 상한을 바꾸는
 * 날 화면만 옛 숫자를 말한다. 코드로 가르는 것은 여기까지다 — 아래 `case`가 그 다섯을 적어 두는
 * 것은 계약을 눈에 보이게 하려는 것이다.
 */
export function proposalAttachmentErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "첨부 자료를 처리하지 못했습니다 — 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case PROPOSAL_ATTACHMENT_ERROR.UNSUPPORTED_TYPE:
    case PROPOSAL_ATTACHMENT_ERROR.TOO_LARGE:
    case PROPOSAL_ATTACHMENT_ERROR.LIMIT_EXCEEDED:
    case PROPOSAL_ATTACHMENT_ERROR.LOCKED:
    case PROPOSAL_ATTACHMENT_ERROR.NOT_SUPPORTED:
      return error.message || "첨부 자료를 올리지 못했습니다";
    case PROPOSAL_ATTACHMENT_ERROR.NOT_FOUND:
      return "첨부 파일이 없습니다 — 목록을 새로고침해주세요";
    case PROPOSAL_ATTACHMENT_ERROR.PUT_FAILED:
      return "파일을 올리지 못했습니다 — 잠시 후 다시 시도해주세요";
    case PROPOSAL_ATTACHMENT_ERROR.TARGET_UNAVAILABLE:
      return "기획안을 저장하지 못해 파일을 올릴 수 없습니다 — 잠시 후 다시 시도해주세요";
    case RESPONSE_ERROR.FORM_RESPONSE_NOT_FOUND:
      return PROPOSAL_RESPONSE_NOT_FOUND;
    case RESPONSE_ERROR.FORM_NOT_ACCEPTING:
      return "접수가 마감돼 파일을 올릴 수 없습니다";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다 — 잠시 후 다시 시도해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "지금은 첨부 자료를 다룰 수 없습니다 — 잠시 후 다시 시도해주세요";
    case AUTH_ERROR.UNAUTHENTICATED:
    case AUTH_ERROR.UNAUTHORIZED:
      return "로그인이 만료됐습니다 — 다시 로그인해주세요";
    default:
      return error.message || "첨부 자료를 처리하지 못했습니다 — 잠시 후 다시 시도해주세요";
  }
}
