import { API_ERROR, ApiError } from "@/shared/api/client";

/**
 * 콘텐츠 조회 실패 → 화면 문구 (#520).
 *
 * 행사의 `eventLoadErrorMessage`와 같은 자리다 — 화면은 서버 `message`를 그대로 쓰지 않고 이
 * 함수만 부른다. 한 줄, «무엇이 안 되나 — 무엇을 하면 되나»(루트 AGENTS «화면 문구»).
 * 404는 여기 오지 않는다 — 페이지는 «준비 중», 포스트는 404 화면으로 화면이 따로 가른다.
 */
export function contentLoadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case API_ERROR.CONFIG_MISSING:
        return "지금은 내용을 불러올 수 없습니다 — 잠시 후 다시 시도해주세요";
      case API_ERROR.NETWORK_ERROR:
        return "서버에 연결하지 못했습니다 — 잠시 후 다시 시도해주세요";
      default:
        return "내용을 불러오지 못했습니다 — 잠시 후 다시 시도해주세요";
    }
  }
  return "내용을 불러오지 못했습니다 — 잠시 후 다시 시도해주세요";
}
