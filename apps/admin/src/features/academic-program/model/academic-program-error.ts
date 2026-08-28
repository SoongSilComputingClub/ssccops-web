import { ACADEMIC_PROGRAM_ERROR } from "@/entities/academic-program";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 학술 활동 조회 실패 → 화면에 띄울 한 줄 (#125 · 서버 #131·#134).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. 조회 셋(목록·상세·커리큘럼)은 **인증만** 요구하므로(가입한 회원
 * 누구나 본다) 남은 403은 거의 나오지 않지만, 서버가 소유권을 보는 경로(mine=true)에서는
 * `FORBIDDEN`이 올 수 있어 함께 분기한다.
 *
 * 403은 상태가 아니라 **코드로 분기한다**(#29). 상태(403)로만 보면 SIGNUP_REQUIRED까지 같은
 * 문장을 받게 되는데, 그쪽은 apiFetch가 이미 가입 화면으로 보낸 뒤라 잘못된 안내가 된다.
 *
 * 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 임의로 뭉개면 원인을 알려주려고 서버가
 * 내려보낸 문장이 사라진다.
 */
export function toAcademicProgramErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "활동 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case ACADEMIC_PROGRAM_ERROR.AUTHORITY_REQUIRED:
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "활동을 볼 권한이 없습니다 — 스터디·프로젝트 관리(ACADEMIC_PROGRAM_MANAGE) 권한이 필요합니다";
    case ACADEMIC_PROGRAM_ERROR.VALIDATION_FAILED:
    case ACADEMIC_PROGRAM_ERROR.INVALID_CODE_VALUE:
      // 커서 형식·정렬·상태 필터가 서버 기준과 어긋난 경우 — 화면을 새로고침하면 필터가 초기화된다
      return "목록 조건이 서버 기준과 다릅니다. 화면을 새로고침해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
