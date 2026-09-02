import { SESSION_REVIEW_ERROR } from "@/entities/academic-session";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 회차·출석 승인 실패 → 화면에 띄울 한 줄 (#129 · 서버 #136).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch 가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. 목록·전이는 ACADEMIC_PROGRAM_MANAGE 를 요구하므로 권한 없는 회원이
 * 주소로 들어오면 403 이 온다 — 상태가 아니라 **코드로 분기한다**(#29).
 *
 * 조회 실패와 전이 실패를 한 함수로 다룬다 — 같은 도메인·같은 인가라 문장을 갈라 둘 이유가
 * 없다. 전이에서만 나오는 409(INVALID_SESSION_TRANSITION)는 "다른 사람이 방금 처리했다"는
 * 뜻이라 재시도 대신 목록 새로고침을 안내한다.
 *
 * 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 임의로 뭉개면 원인을 알려주려고 서버가
 * 내려보낸 문장이 사라진다.
 */
export function toSessionReviewErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "회차 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case SESSION_REVIEW_ERROR.AUTHORITY_REQUIRED:
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "회차를 승인할 권한이 없습니다 — 스터디·프로젝트 관리(ACADEMIC_PROGRAM_MANAGE) 권한이 필요합니다";
    case SESSION_REVIEW_ERROR.INVALID_SESSION_TRANSITION:
      return "이미 처리된 회차입니다 — 다른 사람이 먼저 승인·수정요청했을 수 있습니다. 목록을 새로고침해주세요";
    case SESSION_REVIEW_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
    case SESSION_REVIEW_ERROR.SESSION_NOT_FOUND:
      return "회차를 찾을 수 없습니다 — 이미 삭제됐거나 주소가 잘못됐을 수 있습니다";
    case SESSION_REVIEW_ERROR.VALIDATION_FAILED:
    case SESSION_REVIEW_ERROR.INVALID_CODE_VALUE:
      return "목록 조건이 서버 기준과 다릅니다. 화면을 새로고침해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
