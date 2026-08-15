import { SUB_WORK_ERROR } from "@/entities/sub-work";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 승인함 조회 실패 → 화면에 띄울 한 줄 (OPS-017).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. **하위 업무 조회와 달리 남은 403이 없다** — `GET /v1/approvals`는
 * 인가(#9)를 걸지 않아(서버 ApprovalController 주석) 가입한 회원이면 누구나 볼 수 있다.
 * 그래서 알 수 없는 코드는 서버 메시지를 그대로 보여 준다.
 */
export function toApprovalInboxErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "승인함을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
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

/**
 * 정족수 투표 실패 → 화면에 띄울 한 줄 (OPS-015).
 *
 * 승인·반려(features/sub-work의 toSubWorkActionErrorMessage)와 코드는 같은 도메인
 * (SubWorkController)을 쓰지만 403의 뜻이 다르다 — 여기서는 "이 건의 승인자가 아니다"가
 * 아니라 **"운영진이 아니다"**다(서버 ApprovalAuthorityPolicy.requireStaff). 같은 문자열을
 * 두 문구로 나누는 것은 그래서다.
 *
 * 409 `TRANSITION_NOT_ALLOWED`는 화면이 이미 막고 있어야 하는 상태다(정족수 없는 유형·검토
 * 단계가 아닌 건에는 투표 버튼을 그리지 않는다). 그래도 문구를 두는 것은 화면을 열어 둔
 * 사이 다른 사람이 상태를 바꿨을 때 여기로 떨어지기 때문이다.
 */
export function toApprovalVoteErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "투표를 반영하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "투표할 수 있는 운영진 권한이 없습니다";
    case SUB_WORK_ERROR.NOT_FOUND:
      return "대상을 찾을 수 없습니다. 이미 삭제됐을 수 있으니 승인함을 다시 불러와주세요";
    case SUB_WORK_ERROR.TRANSITION_NOT_ALLOWED:
      return "지금은 투표할 수 없는 상태입니다. 그 사이 상태가 바뀌었을 수 있으니 다시 불러와주세요";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
