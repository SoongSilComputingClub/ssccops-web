import { MEMBER_ERROR } from "@/entities/member";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 회원 조회 실패 → 화면에 띄울 한 줄.
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. 남은 403은 **권한 부족**이다 — 회원 API는 조회까지 MEMBER_MANAGE로
 * 막혀 있어(서버 #76) 가입한 회원도 권한이 없으면 명부를 못 본다. 국장(OPERATOR)이 이 문장을
 * 보는 것은 정상이며 근거는 entities/session/model/types.ts의 CAPABILITY 주석에 있다.
 *
 * 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 임의로 뭉개면 원인을 알려주려고 서버가
 * 내려보낸 문장이 사라진다.
 */
export function toMemberErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    /*
     * 상태(403)가 아니라 코드로 본다(#29). 403에는 미가입(SIGNUP_REQUIRED)도 실려 오는데
     * 그쪽은 apiFetch가 이미 가입 화면으로 보낸 뒤라, 상태로만 보면 여기 문장이 잘못 뜬다.
     */
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "회원 명부를 볼 권한이 없습니다 — 회원 관리(MEMBER_MANAGE) 권한이 필요합니다";
    case MEMBER_ERROR.INVALID_CODE_VALUE:
      return "등급·상태·정렬 값이 서버 기준 코드와 다릅니다. 화면을 새로고침해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
