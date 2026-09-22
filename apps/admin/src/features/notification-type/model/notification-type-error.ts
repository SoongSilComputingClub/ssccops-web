import { NOTIFICATION_TYPE_ERROR } from "@/entities/notification-type";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 알림 유형 조회 실패 → 화면에 띄울 한 줄 (서버 #535 · ADR-0047).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로 여기서
 * 다루지 않는다. 남은 403은 **권한 부족**이다 — 조회부터 SUPER를 요구해(컨트롤러 클래스 레벨)
 * 목차에서 감춘 화면이지만, 주소를 직접 치면 열리므로 이 문구가 필요하다.
 *
 * 403은 상태가 아니라 **코드로 분기한다**(#29). 알 수 없는 코드는 서버 메시지를 그대로 쓴다.
 */
export function toNotificationTypeErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "알림 유형을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "알림 유형을 볼 권한이 없습니다 — 최고 관리자(SUPER) 권한이 필요합니다";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/**
 * 수신 앱 저장 실패 → 화면에 띄울 한 줄.
 *
 * 조회와 문구가 갈리는 자리는 403·404·400 셋이다. 요구 권한은 조회와 같은 SUPER지만 문장을
 * 나누는 것은 **막힌 조작이 다르기 때문**이다 — 표를 보고 있는 사람에게 «볼 권한이 없습니다»는
 * 지금 눈앞의 화면과 어긋난다(권한이 방금 회수되면 실제로 이 자리에 온다).
 *
 * `VALIDATION_FAILED`는 이 API에서 «수신 앱이 비었다» 하나뿐이라(서버 EMPTY_NOTIFICATION_ROUTE)
 * 화면의 선검사와 같은 문구로 받는다 — 어디서 걸렸든 사용자에게는 같은 말이어야 한다.
 */
export function toNotificationTypeSaveErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "수신 앱을 저장하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "수신 앱을 바꿀 권한이 없습니다 — 최고 관리자(SUPER) 권한이 필요합니다";
    case NOTIFICATION_TYPE_ERROR.EMPTY_ROUTE:
      return "앱을 최소 한 곳 선택해야 저장됩니다";
    case NOTIFICATION_TYPE_ERROR.NOTIFICATION_TYPE_NOT_FOUND:
      return "없는 알림 유형입니다 — 목록을 새로고침해주세요";
    default:
      return toNotificationTypeErrorMessage(error);
  }
}
