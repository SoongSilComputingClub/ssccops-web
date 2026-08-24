import { PUBLIC_FORM_ERROR } from "@/entities/form";
import { ApiError } from "@/shared/lib/api/client";
import { toFormErrorMessage } from "./form-error";

/*
 * 응답자에게 보여 줄 문구 (ssccops-server #35 · #36).
 *
 * 운영자용 문구(form-error.ts)와 나눈 이유는 읽는 사람이 다르기 때문이다. 운영자에게는
 * "폼을 찾을 수 없습니다 — 이미 삭제된 폼일 수 있습니다"가 다음 행동을 알려주지만, 응답자에게
 * 폼의 삭제 여부는 알 바가 아니고 알려 줄 이유도 없다. 여기서는 **응답자가 지금 할 수 있는
 * 일**만 말한다.
 */

/** 접수 불가 안내 — DRAFT·CLOSED·기간 전·기간 후를 서버가 한 코드로 묶었으므로 문구도 하나다 */
export const FORM_NOT_ACCEPTING_MESSAGE = "지금은 응답을 받지 않는 폼입니다";

/**
 * 폼·초안을 불러오지 못했을 때.
 *
 * 접수 불가(409)와 없는 폼(404)은 오류 문구가 아니라 **화면 자체가 갈리므로** 여기서 다루지
 * 않는다 — 호출부(use-public-form)가 코드로 분기한다.
 */
export function toPublicFormLoadErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "폼을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }
  return toFormErrorMessage(error);
}

/**
 * 자동 저장 실패 문구.
 *
 * 크기 초과(413)를 그냥 "저장 실패"로 뭉개지 않는 것이 핵심이다 — 자동 저장은 타이핑마다 같은
 * 본문을 통째로 다시 보내므로, 원인을 말해 주지 않으면 응답자는 실패가 계속 반복되는 화면을
 * 보면서도 무엇을 줄여야 하는지 알 수 없다.
 */
export function toDraftSaveErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "자동 저장에 실패했습니다. 작성한 내용은 화면에 남아 있습니다";
  }

  switch (error.code) {
    case PUBLIC_FORM_ERROR.RESPONSE_CONTENT_TOO_LARGE:
      return "작성한 내용이 너무 깁니다(전체 10만 자). 내용을 줄이면 다시 저장됩니다";
    case PUBLIC_FORM_ERROR.FORM_NOT_ACCEPTING:
      return "접수가 끝나 더 이상 저장되지 않습니다";
    case PUBLIC_FORM_ERROR.RESPONSE_ALREADY_SUBMITTED:
      return "이미 제출한 폼입니다. 다른 창에서 제출했는지 확인해주세요";
    case PUBLIC_FORM_ERROR.RESPONSE_ALREADY_REJECTED:
      return "반려된 응답이라 더 저장되지 않습니다 — 결과는 안내받은 채널에서 확인해주세요";
    case PUBLIC_FORM_ERROR.RESPONSE_SAVE_CONFLICT:
      return "저장이 동시에 겹쳤습니다";
    case PUBLIC_FORM_ERROR.UNKNOWN_QUESTION_ITEM:
    case PUBLIC_FORM_ERROR.INVALID_ANSWER_VALUE:
      return "폼의 문항이 바뀌었습니다. 새로고침한 뒤 다시 작성해주세요";
    case PUBLIC_FORM_ERROR.FORM_NOT_FOUND:
      return "폼을 찾을 수 없습니다";
    default:
      return toFormErrorMessage(error);
  }
}

/**
 * 제출 실패 문구 — 인라인 오류를 붙이지 못한 경우에만 쓴다.
 *
 * **서버 400은 어느 문항이 문제인지 알려주지 않는다.** `GeneralException(FormErrorCode.X)`가
 * 코드와 고정 문구만 싣고 `qitemId`는 담지 않는다(이슈 본문은 #35와 합의해 담기로 적었지만
 * 머지된 구현에는 없다). 그래서 호출부는 같은 규칙의 웹 검증을 다시 돌려 문항을 찾아 붙이고,
 * 그래도 못 찾았을 때 이 문구를 화면 위쪽에 한 줄로 보여 준다.
 */
export function toSubmitErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "제출하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case PUBLIC_FORM_ERROR.REQUIRED_ANSWER_MISSING:
      return "필수 항목을 모두 채워주세요";
    case PUBLIC_FORM_ERROR.ANSWER_PATTERN_MISMATCH:
      return "형식이 맞지 않는 답변이 있습니다";
    case PUBLIC_FORM_ERROR.ANSWER_SELECTION_LIMIT_EXCEEDED:
      return "선택할 수 있는 개수를 넘긴 문항이 있습니다";
    case PUBLIC_FORM_ERROR.UNKNOWN_QUESTION_ITEM:
    case PUBLIC_FORM_ERROR.INVALID_ANSWER_VALUE:
      return "폼의 문항이 바뀌었습니다. 새로고침한 뒤 다시 제출해주세요";
    case PUBLIC_FORM_ERROR.RESPONSE_CONTENT_TOO_LARGE:
      return "작성한 내용이 너무 깁니다(전체 10만 자). 내용을 줄여 다시 제출해주세요";
    /*
     * 반려는 그 응답에 대해 **끝났다**는 뜻이다 (ssccops-server #141). "이미 제출했습니다"로
     * 뭉개면 응답자는 오지 않을 심사 결과를 기다리므로, 다시 낼 수 없다는 것을 그대로 말한다.
     */
    case PUBLIC_FORM_ERROR.RESPONSE_ALREADY_REJECTED:
      return "반려된 응답은 다시 제출할 수 없습니다 — 결과는 안내받은 채널에서 확인해주세요";
    case PUBLIC_FORM_ERROR.FORM_NOT_FOUND:
      return "폼을 찾을 수 없습니다";
    default:
      return toFormErrorMessage(error);
  }
}
