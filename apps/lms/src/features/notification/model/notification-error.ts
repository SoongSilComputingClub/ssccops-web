import { API_ERROR, ApiError } from "@/shared/api/client";

/** `ApiError.code` → 알림 목록 화면 문구 (#606 · 어드민 #604와 같은 문장). 남의 알림은 404라 «없는 알림»으로만 다룬다 */
export function toNotificationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === API_ERROR.NETWORK_ERROR || error.status >= 500) {
      return "알림을 불러오지 못했습니다 — 잠시 후 다시 시도해주세요";
    }
    if (error.status === 404) return "없는 알림입니다 — 목록을 새로고침해주세요";
  }
  return "알림을 불러오지 못했습니다 — 새로고침해주세요";
}
