import { FORM_ERROR } from "@/entities/form";
import { API_ERROR, ApiError } from "@/shared/api/client";

/*
 * 신청 실패 → 화면 문구.
 *
 * 서버 문구(`message`)를 그대로 쓰지 않는다 — 운영자·개발자 기준이라 신청자에게 뜻이 닿지
 * 않는 것이 섞여 있다. **원인 + 다음 행동** 순서로 쓰고 부연은 대시로 잇는다. 코드값은
 * 어느 문구에도 넣지 않는다.
 *
 * 로그인·가입이 필요한 실패는 여기서 다루지 않는다 — 그 둘은 문구가 아니라 **화면이** 달라서
 * (로그인 버튼 · 가입 폼) 신청 화면이 따로 그린다.
 */

/** 접수 불가 안내 — 서버가 준비 중·마감·기간 밖을 한 코드로 묶었으므로 문구도 하나다 */
export const NOT_ACCEPTING_MESSAGE = "지금은 신청을 받지 않습니다";

/** 신청서를 불러오지 못했을 때. 접수 불가(409)와 없는 폼(404)은 화면이 갈리므로 여기 없다 */
export function applyLoadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case API_ERROR.CONFIG_MISSING:
        return "서비스 설정이 끝나지 않아 신청서를 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요";
      case API_ERROR.NETWORK_ERROR:
        return "서버에 연결하지 못했습니다 — 네트워크 상태를 확인한 뒤 다시 시도해 주세요";
      case FORM_ERROR.FORM_CONTENT_MALFORMED:
        return "신청서가 아직 준비되지 않았습니다 — 운영진에게 문의해 주세요";
    }
  }
  return "신청서를 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요";
}

/**
 * 자동 저장 실패 문구.
 *
 * 크기 초과를 "저장 실패"로 뭉개지 않는 것이 핵심이다 — 자동 저장은 같은 본문을 통째로 다시
 * 보내므로, 원인을 말해 주지 않으면 신청자는 실패가 반복되는 화면을 보면서도 무엇을 줄여야
 * 하는지 알 수 없다.
 */
export function draftSaveErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "자동 저장에 실패했습니다 — 작성한 내용은 화면에 남아 있습니다";
  }

  switch (error.code) {
    case FORM_ERROR.RESPONSE_CONTENT_TOO_LARGE:
      return "작성한 내용이 너무 깁니다 — 조금 줄이면 다시 저장됩니다";
    case FORM_ERROR.FORM_NOT_ACCEPTING:
      return "접수가 끝나 더 이상 저장되지 않습니다";
    case FORM_ERROR.RESPONSE_ALREADY_SUBMITTED:
      return "이미 제출한 신청입니다 — 다른 창에서 제출했는지 확인해 주세요";
    case FORM_ERROR.RESPONSE_ALREADY_REJECTED:
      return "받아들여지지 않은 신청이라 더 저장되지 않습니다";
    case FORM_ERROR.RESPONSE_SAVE_CONFLICT:
      return "저장이 동시에 겹쳤습니다";
    case FORM_ERROR.UNKNOWN_QUESTION_ITEM:
    case FORM_ERROR.INVALID_ANSWER_VALUE:
      return "신청서의 문항이 바뀌었습니다 — 새로고침한 뒤 다시 작성해 주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결하지 못해 저장하지 못했습니다 — 연결되면 다시 저장됩니다";
    default:
      return "자동 저장에 실패했습니다 — 작성한 내용은 화면에 남아 있습니다";
  }
}

/**
 * 제출 실패 문구 — 문항에 인라인으로 붙이지 못한 경우에만 쓴다.
 *
 * **서버 400은 어느 문항이 문제인지 알려주지 않는다.** 그래서 호출부가 같은 규칙의 웹 검증을
 * 다시 돌려 문항을 찾아 붙이고, 그래도 못 찾았을 때 이 문구를 화면 위쪽에 한 줄로 남긴다.
 */
export function submitErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "제출하지 못했습니다 — 잠시 후 다시 시도해 주세요";
  }

  switch (error.code) {
    case FORM_ERROR.REQUIRED_ANSWER_MISSING:
      return "필수 항목을 모두 채워 주세요";
    case FORM_ERROR.ANSWER_PATTERN_MISMATCH:
      return "형식이 맞지 않는 답이 있습니다";
    case FORM_ERROR.ANSWER_SELECTION_LIMIT_EXCEEDED:
      return "선택할 수 있는 개수를 넘긴 문항이 있습니다";
    case FORM_ERROR.UNKNOWN_QUESTION_ITEM:
    case FORM_ERROR.INVALID_ANSWER_VALUE:
      return "신청서의 문항이 바뀌었습니다 — 새로고침한 뒤 다시 제출해 주세요";
    case FORM_ERROR.RESPONSE_CONTENT_TOO_LARGE:
      return "작성한 내용이 너무 깁니다 — 조금 줄여 다시 제출해 주세요";
    /*
     * 받아들여지지 않은 신청을 다시 내려 한 경우다. "이미 신청했습니다"로 뭉개면 신청자는
     * 오지 않을 결과를 기다리므로, 다시 낼 수 없다는 것을 그대로 말한다.
     */
    case FORM_ERROR.RESPONSE_ALREADY_REJECTED:
      return "이 신청은 다시 제출할 수 없습니다 — 결과는 '내 신청'에서 확인해 주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결하지 못했습니다 — 네트워크 상태를 확인한 뒤 다시 제출해 주세요";
    default:
      return "제출하지 못했습니다 — 잠시 후 다시 시도해 주세요";
  }
}
