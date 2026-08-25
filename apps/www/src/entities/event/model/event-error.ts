import { API_ERROR, ApiError } from "@/shared/api/client";

/**
 * 조회 실패 → 화면 문구.
 *
 * 화면은 서버 문구(`message`)를 그대로 쓰지 않고 이 함수만 부른다 — 서버 문구는 운영자·개발자
 * 기준이라 공개 화면에서 읽는 사람에게는 뜻이 닿지 않는 것이 섞여 있다. **원인 + 다음 행동**
 * 순서로 쓰고 부연은 대시로 잇는다.
 */
export function eventLoadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case API_ERROR.CONFIG_MISSING:
        return "서비스 설정이 끝나지 않아 행사 정보를 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요";
      case API_ERROR.NETWORK_ERROR:
        return "서버에 연결하지 못했습니다 — 네트워크 상태를 확인한 뒤 다시 시도해 주세요";
      default:
        return "행사 정보를 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요";
    }
  }
  return "행사 정보를 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요";
}
