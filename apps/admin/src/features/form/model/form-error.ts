import {
  FORM_ERROR,
  FORM_LABEL_ERROR,
  SYSTEM_FORM_DELETE_LOCKED,
  SYSTEM_FORM_QITEM_LOCKED,
} from "@/entities/form";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 폼 조회 실패 → 화면에 띄울 한 줄.
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서는 다루지 않는다. 화면이 할 일은 남은 오류를 사람이 읽을 문장으로 바꾸는 것뿐이다.
 *
 * 남은 403은 **권한 부족**이다(#29 · 서버 #9). 서버 문장은 "권한이 없습니다."로 끝나 무엇을
 * 해야 하는지가 없으므로 여기서 다시 쓴다 — 사용자가 알아야 할 것은 자기 잘못이 아니라
 * 역할이 필요하다는 사실이다.
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
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "폼을 다룰 권한이 없습니다 — 폼 조회(FORM_READ) 권한이 필요합니다";
    /*
     * 시스템 폼 잠금 두 가지(서버 #140)를 여기서 함께 받는다. 다른 폼 오류 매핑들이 전부 이
     * 함수를 default로 두고 있어, 어느 경로로 들어오든 **화면이 미리 그린 잠금과 같은 문장**이
     * 나온다 — 화면 판단을 우회한 요청(주소창·오래된 탭)이 여기 걸린다.
     */
    case FORM_ERROR.SYSTEM_FORM_IMMUTABLE:
      return SYSTEM_FORM_DELETE_LOCKED;
    case FORM_ERROR.SYSTEM_FORM_CONTRACT_VIOLATION:
      return SYSTEM_FORM_QITEM_LOCKED;
    default:
      return error.message;
  }
}

/**
 * 접수 상태 전이 실패 → 화면에 띄울 한 줄 (ssccops-server #33).
 *
 * 서버 메시지를 그대로 쓰지 않고 여기서 다시 쓰는 코드가 셋 있다. 서버 문장은 "왜 거절했는가"를
 * 말하지만, 이 셋은 **사용자가 다음에 무엇을 해야 하는지**가 문장에 있어야 하기 때문이다.
 * - 전이표 밖: 원인이 사용자가 아니라 화면이 낡은 것이다 → 다시 불러온다고 알린다
 * - 문항 0개: 접수를 시작하려면 편집 화면에서 문항을 추가해야 한다
 * - 접수 기간 모순: 고칠 곳이 접수 시작·종료 일시라는 것을 짚어 준다
 */
export function toFormStatusErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "접수 상태를 바꾸지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case FORM_ERROR.INVALID_FORM_STATUS_TRANSITION:
      return "이미 상태가 바뀐 폼입니다. 최신 상태를 다시 불러옵니다";
    case FORM_ERROR.FORM_HAS_NO_QUESTION:
      return "문항을 1개 이상 추가해야 접수를 시작할 수 있습니다";
    case FORM_ERROR.INVALID_RECEIPT_PERIOD:
      return "접수 시작·종료 일시를 확인해주세요";
    case FORM_ERROR.FORM_NOT_FOUND:
      return "폼을 찾을 수 없습니다 — 이미 삭제된 폼일 수 있습니다";
    default:
      return toFormErrorMessage(error);
  }
}

/**
 * 복제 실패 → 화면에 띄울 한 줄 (ssccops-server #32).
 *
 * 복제는 본문 없이 원본 ID만 보내므로 사용자가 고칠 수 있는 실패가 사실상 "원본이 없다"뿐이다.
 * 나머지는 공통 처리로 넘긴다.
 */
export function toFormDuplicateErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === FORM_ERROR.FORM_NOT_FOUND) {
    return "원본 폼을 찾을 수 없습니다 — 이미 삭제된 폼일 수 있습니다";
  }
  if (!(error instanceof ApiError)) {
    return "폼을 복제하지 못했습니다. 잠시 후 다시 시도해주세요";
  }
  return toFormErrorMessage(error);
}

/**
 * 라벨 추가·사용_여부 변경 실패 → 화면에 띄울 한 줄 (ssccops-server #34).
 *
 * `VALIDATION_FAILED`는 서버 문장을 그대로 쓴다 — "50자를 넘을 수 없습니다"처럼 어느 칸이
 * 왜 틀렸는지를 서버가 이미 담아 보내므로, 여기서 뭉개면 입력란 옆에 붙일 말이 사라진다.
 *
 * 403은 이제 코드로 분기한다(#29). 역할 인가가 붙어(서버 #9) 라벨 추가·비활성화는
 * FORM_LABEL_MANAGE를 요구하며, 거절 코드가 FORBIDDEN으로 확정됐다. 상태(403)로만 보면
 * SIGNUP_REQUIRED까지 같은 문장을 받게 되는데 그쪽은 apiFetch가 이미 가입 화면으로 보낸 뒤라
 * 여기 문장이 잘못 뜨는 것이다.
 */
export function toFormLabelErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "라벨 정보를 처리하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "라벨을 관리할 권한이 없습니다 — 폼 라벨 관리(FORM_LABEL_MANAGE) 권한이 필요합니다";
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
