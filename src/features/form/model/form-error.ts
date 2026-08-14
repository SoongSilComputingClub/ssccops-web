import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 폼 조회 실패 → 화면에 띄울 한 줄.
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서는 다루지 않는다. 화면이 할 일은 남은 오류를 사람이 읽을 문장으로 바꾸는 것뿐이다.
 *
 * 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 임의로 "오류가 발생했습니다"로 뭉개면
 * 원인을 알려주려고 서버가 내려보낸 문장이 사라진다.
 */
export function toFormErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "폼 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
