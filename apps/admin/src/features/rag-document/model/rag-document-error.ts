import { RAG_DOCUMENT_ERROR } from "@/entities/rag-document";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/*
 * ApiError.code → 화면 문구 (#432 · 서버 `AssistantErrorCode`).
 *
 * 화면은 이 함수들만 부른다. 서버 문장은 "왜 거절했는가"까지만 말하므로 사용자가 **다음에
 * 무엇을 해야 하는지**가 필요한 코드만 여기서 다시 쓰고, 나머지는 서버 메시지를 그대로 둔다.
 *
 * 401·403 SIGNUP_REQUIRED는 `apiFetch`가 리다이렉트까지 끝내므로 여기서 다루지 않는다.
 * 남은 403은 권한 부족이다 — 이 API는 **목록 조회까지 전부** RAG_DOCUMENT_MANAGE라 한 문장으로
 * 답한다(템플릿 관리와 같은 자리).
 */

/** 권한이 없어 잠긴 조작에 붙는 사유. 화면의 title 툴팁과 오류 문구가 같은 말을 하게 한다 */
export const NO_RAG_DOCUMENT_MANAGE =
  "규정 문서를 관리할 권한이 없습니다 — 규정 문서 관리(RAG_DOCUMENT_MANAGE) 권한이 필요합니다";

/** 목록 조회·재색인·삭제·적용 전환 실패 → 화면에 띄울 한 줄 */
export function toRagDocumentErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "규정 문서를 처리하지 못했습니다 — 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.CONFIG_MISSING:
      return "서버 주소가 설정되지 않았습니다 — 관리자에게 알려주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다 — 잠시 후 다시 시도해주세요";
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return NO_RAG_DOCUMENT_MANAGE;
    /*
     * 기능 플래그가 꺼져 있으면 404다 — «없는 문서»와 코드가 갈리므로 문구도 갈린다.
     * 이 경우 재시도는 뜻이 없다(사람이 설정을 켜야 한다).
     */
    case RAG_DOCUMENT_ERROR.DISABLED:
      return "규정 도우미가 꺼져 있습니다 — 관리자에게 알려주세요";
    case RAG_DOCUMENT_ERROR.NOT_FOUND:
      return "규정 문서를 찾을 수 없습니다 — 목록을 새로고침한 뒤 다시 시도해주세요";
    /*
     * 색인이 끝나지 않은 판본을 올리려 한 경우. 화면이 버튼을 미리 잠그므로 여기까지 오는 것은
     * 잠근 뒤 색인이 되돌아간 경우(재색인)뿐이라, 다음에 할 일을 그대로 적는다.
     */
    case RAG_DOCUMENT_ERROR.NOT_INDEXED:
      return "색인이 끝난 판본만 시행 중으로 올릴 수 있습니다 — 색인이 끝난 뒤 다시 시도해주세요";
    case RAG_DOCUMENT_ERROR.INVALID_APPLY_TRANSITION:
      return "적용 상태를 그렇게 바꿀 수 없습니다 — 목록을 새로고침한 뒤 다시 시도해주세요";
    /*
     * 이미 대기 중인 판본에 재색인을 부른 경우다. 폴링이 곧 상태를 갱신하므로 «기다리라»가
     * 정확한 다음 행동이다 — 다시 누르게 하면 같은 400을 받는다.
     */
    case RAG_DOCUMENT_ERROR.INVALID_INDEX_TRANSITION:
      return "이미 색인을 기다리는 문서입니다 — 색인이 끝날 때까지 기다려주세요";
    case RAG_DOCUMENT_ERROR.LIMIT_EXCEEDED:
      return `코퍼스가 담을 수 있는 양을 넘었습니다 — ${error.message}`;
    default:
      return error.message;
  }
}

/**
 * 업로드 실패 → 화면에 띄울 한 줄.
 *
 * **파싱 실패(`RAG_DOCUMENT_PARSE_FAILED`)만은 서버 문장을 그대로 싣는다.** `.md`는 몇째 줄이
 * 왜 걸렸는지가 그 문장에 있고(서버 #399), 미리보기 단계가 없는 이 화면에서 운영진이 원인을
 * 아는 길은 그것뿐이다 — 여기서 «문서를 읽을 수 없습니다»로 뭉개면 고칠 자리를 찾지 못한다.
 */
export function toRagUploadErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "문서를 올리지 못했습니다 — 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case RAG_DOCUMENT_ERROR.PARSE_FAILED:
      return `문서를 읽을 수 없습니다 — ${error.message}`;
    case RAG_DOCUMENT_ERROR.UNSUPPORTED_TYPE:
      return `받지 않는 파일 형식입니다 — ${error.message}`;
    /*
     * 화면이 먼저 막으므로 여기까지 오는 일은 드물다. 그래도 남겨 두는 것은 서버 판정이
     * 방어선이기 때문이다 — 둘 중 하나를 없애지 않는다(#432).
     */
    case RAG_DOCUMENT_ERROR.TOO_LARGE:
      return "파일이 너무 큽니다 — 10MB 이하로 줄여 다시 올려주세요";
    case RAG_DOCUMENT_ERROR.RATE_LIMITED:
      return "오늘 올릴 수 있는 문서 수를 넘었습니다 — 내일 다시 시도해주세요";
    default:
      return toRagDocumentErrorMessage(error);
  }
}
