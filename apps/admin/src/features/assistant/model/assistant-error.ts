import { ASSISTANT_ERROR } from "@/entities/assistant";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/*
 * ApiError.code → 화면 문구 (#433 · 서버 `AssistantErrorCode`).
 *
 * **원문 오류를 노출하지 않는다**(이슈). 나머지 도메인은 «서버 문장을 그대로 두고 필요한
 * 코드만 다시 쓴다»였지만 여기서는 반대로 **모든 코드를 여기서 적는다** — 도우미가 부르는
 * 바깥 것(모델 공급자)의 오류가 `message`에 섞여 들어올 수 있는 유일한 자리이고, 그 문장은
 * 운영진에게 아무 뜻도 전하지 않는다.
 *
 * 401·403 SIGNUP_REQUIRED는 `apiFetch`가 리다이렉트까지 끝내므로 여기서 다루지 않는다.
 */

/** 질의 실패 → 말풍선 자리에 띄울 한 줄 */
export function toAssistantErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "답변을 가져오지 못했습니다 — 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.CONFIG_MISSING:
      return "서버 주소가 설정되지 않았습니다 — 관리자에게 알려주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다 — 잠시 후 다시 시도해주세요";
    /*
     * 한도는 둘이다 — 분당(잠시 뒤)과 하루(내일). 서버가 `message`로 그것을 가르지만 그
     * 문장을 그대로 싣지 않는 것은 위 규칙과 같고, 대신 **둘을 아우르는 다음 행동**을 적는다.
     * 어느 쪽이든 사용자가 할 일은 기다리는 것 하나다.
     */
    case ASSISTANT_ERROR.RATE_LIMITED:
      return "질문이 너무 많습니다 — 잠시 후 다시 시도해주세요";
    /*
     * 모델 호출 실패(503)·배선 없음(503)·기능 꺼짐(404) 셋은 **사용자가 할 수 있는 일이
     * 같다**(기다리거나 관리자에게 알린다). 다만 꺼진 것은 기다려도 켜지지 않으므로 갈랐다.
     */
    case ASSISTANT_ERROR.UPSTREAM_FAILED:
      return "일시적으로 답할 수 없어요 — 잠시 후 다시 시도해주세요";
    case ASSISTANT_ERROR.UNAVAILABLE:
    case ASSISTANT_ERROR.DISABLED:
      return "규정 도우미를 지금 사용할 수 없습니다 — 관리자에게 알려주세요";
    /*
     * 화면이 1,000자에서 먼저 막으므로 여기까지 오는 일은 드물다. 그래도 남기는 것은 서버
     * 판정이 방어선이기 때문이다.
     */
    case ASSISTANT_ERROR.QUESTION_TOO_LONG:
      return "질문이 너무 깁니다 — 1,000자 이하로 줄여 다시 물어봐주세요";
    /*
     * 대화 식별자가 남의 것이거나 모양이 틀렸다. 훅이 새 대화로 한 번 다시 보내므로 이
     * 문구까지 오는 것은 그 재시도마저 실패한 경우뿐이다.
     */
    case ASSISTANT_ERROR.CONVERSATION_FORBIDDEN:
      return "대화를 이어 갈 수 없습니다 — 잠시 후 다시 물어봐주세요";
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "규정 도우미를 사용할 권한이 없습니다";
    default:
      /*
       * 알지 못하는 코드다. 서버 문장을 흘리지 않는 것이 이 함수의 규칙이라 기본값도 우리
       * 문장으로 둔다 — 여기서 `error.message`를 쓰면 위의 규칙이 무의미해진다.
       */
      return "답변을 가져오지 못했습니다 — 잠시 후 다시 시도해주세요";
  }
}
