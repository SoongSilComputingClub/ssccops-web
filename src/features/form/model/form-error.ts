import { FORM_LABEL_ERROR } from "@/entities/form";
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

/**
 * 라벨 추가·사용_여부 변경 실패 → 화면에 띄울 한 줄 (ssccops-server #34).
 *
 * `VALIDATION_FAILED`는 서버 문장을 그대로 쓴다 — "50자를 넘을 수 없습니다"처럼 어느 칸이
 * 왜 틀렸는지를 서버가 이미 담아 보내므로, 여기서 뭉개면 입력란 옆에 붙일 말이 사라진다.
 *
 * 403은 코드로 분기하지 않고 상태로 본다. 라벨 생성·비활성화는 최고운영자 전용이지만
 * 역할 인가(ssccops-server #9)가 아직 없어 서버가 어떤 코드로 거절할지 정해지지 않았다 —
 * 지금 화면을 막지는 않되, 서버가 막기 시작하면 "권한이 없다"고 말할 수 있어야 한다.
 */
export function toFormLabelErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "라벨 정보를 처리하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  if (error.status === 403) {
    return "권한이 없습니다 — 라벨 추가·사용_여부 변경은 최고운영자만 할 수 있습니다";
  }

  switch (error.code) {
    // 현재 클라이언트 선검사와 같은 문구를 쓴다 — 어디서 걸렸든 사용자에게는 같은 말이어야 한다
    case FORM_LABEL_ERROR.FORM_LABEL_NAME_DUPLICATED:
      return "이미 있는 라벨입니다";
    case FORM_LABEL_ERROR.FORM_LABEL_NOT_FOUND:
      return "이미 없는 라벨입니다. 목록을 다시 불러옵니다";
    case FORM_LABEL_ERROR.FORM_LABEL_NOT_USABLE:
      return "비활성 라벨은 새로 지정할 수 없습니다";
    default:
      return toFormErrorMessage(error);
  }
}
