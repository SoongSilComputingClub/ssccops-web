import { FORM_ERROR } from "@/entities/form";
import { FORM_TEMPLATE_ERROR } from "@/entities/form-template";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/*
 * ApiError.code → 화면 문구 (ssccops-server #142).
 *
 * 화면은 이 함수들만 부른다. 서버 문장은 "왜 거절했는가"까지만 말하므로, 사용자가 **다음에
 * 무엇을 해야 하는지**가 필요한 코드만 여기서 다시 쓴다 — 나머지는 서버 메시지를 그대로 둔다
 * (임의로 "오류가 발생했습니다"로 뭉개면 원인을 알려주려고 서버가 보낸 문장이 사라진다).
 *
 * 401·403 SIGNUP_REQUIRED는 apiFetch가 리다이렉트까지 끝내므로 여기서 다루지 않는다.
 * 남은 403은 권한 부족이다 — 템플릿 API는 조회까지 전부 FORM_WRITE라 한 문장으로 답한다.
 */

/** 권한이 없어 잠긴 조작에 붙는 사유. 화면의 title 툴팁과 오류 문구가 같은 말을 하게 한다 */
export const NO_TEMPLATE_WRITE =
  "템플릿을 관리할 권한이 없습니다 — 폼 작성(FORM_WRITE) 권한이 필요합니다";

/** 템플릿 조회·저장·사용 여부 전환 실패 → 화면에 띄울 한 줄 */
export function toFormTemplateErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "템플릿 정보를 처리하지 못했습니다 — 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.CONFIG_MISSING:
      return "서버 주소가 설정되지 않았습니다 — 관리자에게 알려주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다 — 잠시 후 다시 시도해주세요";
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return NO_TEMPLATE_WRITE;
    case FORM_TEMPLATE_ERROR.FORM_TEMPLATE_NOT_FOUND:
      return "템플릿을 찾을 수 없습니다 — 목록을 다시 불러온 뒤 선택해주세요";
    /*
     * 어느 문항이 잘못됐는지는 서버 응답만으로 알 수 없다(계약에 그 자리가 없다). 대신 편집기가
     * 같은 규칙으로 미리 검사해 문항 카드에 표시하므로, 여기서는 서버 문장을 덧붙여 둔다.
     */
    case FORM_TEMPLATE_ERROR.INVALID_QUESTION_COMPOSITION:
      return `문항 구성이 올바르지 않습니다 — ${error.message}`;
    default:
      return error.message;
  }
}

/**
 * '이 템플릿으로 폼 만들기' 실패 → 화면에 띄울 한 줄.
 *
 * 선택지에는 켜진 템플릿만 싣지만(기존 결정), 고르는 사이에 다른 운영진이 그 템플릿을 내릴 수
 * 있다. 그때 화면이 할 일은 사과가 아니라 **어디서 다시 켤 수 있는지**를 알려주는 것이다.
 */
export function toFormFromTemplateErrorMessage(error: unknown): string {
  if (
    error instanceof ApiError &&
    error.code === FORM_TEMPLATE_ERROR.FORM_TEMPLATE_NOT_USABLE
  ) {
    return "사용하지 않는 템플릿입니다 — 템플릿 관리에서 사용 여부를 켠 뒤 다시 시도해주세요";
  }
  return toFormTemplateErrorMessage(error);
}

/**
 * '이 폼을 템플릿으로 저장' 실패 → 화면에 띄울 한 줄.
 *
 * 이 경로에서는 폼과 템플릿이 한 요청에 함께 등장한다. 폼의 404는 공통 코드(`"NOT_FOUND"`)이고
 * 템플릿의 404는 전용 코드라, 무엇을 찾지 못한 것인지 코드로 갈린다 — 서버가 일부러 나눠 둔
 * 것이므로 문구도 나눈다.
 */
export function toTemplateFromFormErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === FORM_ERROR.FORM_NOT_FOUND) {
    return "폼을 찾을 수 없습니다 — 이미 삭제된 폼일 수 있습니다";
  }
  return toFormTemplateErrorMessage(error);
}
