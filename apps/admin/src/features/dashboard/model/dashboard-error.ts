import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 운영 대시보드 조회 실패 → 화면에 띄울 한 줄 (OPS-038).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. 남은 403은 **권한 부족**이다 — `GET /v1/dashboard`는 WORK_MANAGE로
 * 막혀 있어(서버 #9) 가입한 회원도 권한이 없으면 대시보드를 못 본다(하위 업무 목록
 * toSubWorkErrorMessage와 같은 판단).
 *
 * 알 수 없는 코드는 서버 메시지를 그대로 보여 준다.
 */
export function toDashboardErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "운영 대시보드를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "운영 대시보드를 볼 권한이 없습니다 — 운영진 권한(WORK_MANAGE)이 필요합니다";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
