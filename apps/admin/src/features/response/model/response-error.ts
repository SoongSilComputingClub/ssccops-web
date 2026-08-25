import { RESPONSE_ERROR } from "@/entities/response";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 응답 조회·검토 처리 실패 → 화면에 띄울 한 줄.
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서는 다루지 않는다. 화면이 할 일은 남은 오류를 사람이 읽을 문장으로 바꾸는 것뿐이다.
 *
 * 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 임의로 "오류가 발생했습니다"로 뭉개면
 * 원인을 알려주려고 서버가 내려보낸 문장이 사라진다. (features/form/model/form-error.ts와
 * 같은 규칙이다.)
 */
export function toResponseErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "응답 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    /*
     * 응답 API는 조회까지 RESPONSE_REVIEW로 막혀 있다(서버 #9) — 가입한 회원이라도 권한이
     * 없으면 목록조차 못 본다. 상태(403)가 아니라 코드로 보는 이유는 form-error.ts와 같다.
     */
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "응답을 심사할 권한이 없습니다 — 응답 심사(RESPONSE_REVIEW) 권한이 필요합니다";
    case RESPONSE_ERROR.FORM_RESPONSE_NOT_FOUND:
      return "응답을 찾을 수 없습니다";
    /*
     * 화면이 이미 잠가 둔 조작이 서버까지 간 경우다 — 다른 검토자가 방금 결론을 냈거나,
     * 제출 전(작성 중) 답안을 심사하려 했거나, 지금과 같은 상태를 다시 고른 것이다. 어느
     * 쪽이든 사용자가 할 다음 행동은 같다: 지금 상태를 다시 받아 보는 것.
     */
    case RESPONSE_ERROR.INVALID_RESPONSE_STATUS_TRANSITION:
      return "이 응답은 더 이상 심사할 수 없습니다 — 승인·반려는 되돌릴 수 없으니 화면을 새로 고쳐 현재 상태를 확인해주세요";
    /*
     * 화면이 먼저 잠그는 조건과 같은 규칙이라(수정요청·반려는 의견 필수) 여기까지 오는 것은
     * 공백만 입력했거나 화면 검증을 우회한 요청뿐이다. 그래도 문구를 두는 이유는, 없으면
     * 서버 원문("수정요청·반려는 검토 의견을 반드시 입력해야 합니다")이 그대로 뜨면서
     * 다음에 무엇을 하라는 말이 빠지기 때문이다.
     */
    case RESPONSE_ERROR.REVIEW_OPINION_REQUIRED:
      return "검토 의견이 비어 있습니다 — 수정요청·반려는 무엇을 고쳐야 하는지 적어주세요";
    case RESPONSE_ERROR.INVALID_CODE_VALUE:
      return "선택한 결론이 올바르지 않습니다. 다시 선택해주세요";
    /*
     * 기획안 승인이 학술 활동 이관에서 막혔다 (서버 #150). **서버 문장을 지우지 않는다** —
     * 이 코드는 하나이고 무엇이 어긋났는지(몇 번째 커리큘럼 줄인지, 어느 필수 항목이 비었는지)는
     * `message`가 값으로 나르므로, 다른 코드처럼 문구를 갈아 끼우면 검토자가 수정요청에 옮겨
     * 적을 유일한 단서가 사라진다.
     *
     * 뒤에 붙이는 것은 다음 행동뿐이다. 승인은 종결이라 여기서 재시도할 것이 없고 — 같은
     * 응답을 다시 승인해도 같은 사유로 막힌다 — 고칠 수 있는 사람은 제출자다.
     */
    case RESPONSE_ERROR.PROPOSAL_MIGRATION_FAILED:
      return `${error.message} — 다시 눌러도 같은 사유로 막히므로, 승인 대신 이 사유를 적어 수정요청으로 돌려주세요`;
    default:
      return error.message;
  }
}
