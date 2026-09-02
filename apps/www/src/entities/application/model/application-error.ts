import { API_ERROR, ApiError } from "@/shared/api/client";

/**
 * 신청 조회 실패 → 화면 문구.
 *
 * 로그인·가입이 필요한 실패는 여기서 다루지 않는다 — 그 둘은 문구가 아니라 **다음 행동**이
 * 달라서(로그인 버튼 · 가입 안내) 화면이 따로 그린다(`shared/api/authed-client`의
 * `isUnauthenticated`·`isSignupRequired`). 여기에 남는 것은 "어쨌든 불러오지 못했다"뿐이다.
 *
 * 서버 문구(`message`)를 그대로 쓰지 않는 것은 그것이 운영자·개발자 기준이기 때문이다.
 * **원인 + 다음 행동** 순서로 쓰고 부연은 대시로 잇는다.
 */
export function myApplicationsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case API_ERROR.CONFIG_MISSING:
        return "서비스 설정이 끝나지 않아 신청 현황을 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요";
      case API_ERROR.NETWORK_ERROR:
        return "서버에 연결하지 못했습니다 — 네트워크 상태를 확인한 뒤 다시 시도해 주세요";
      default:
        return "신청 현황을 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요";
    }
  }
  return "신청 현황을 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요";
}
