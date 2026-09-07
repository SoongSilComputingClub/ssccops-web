import { ApiError } from "@/shared/lib/api/client";
import { toFormErrorMessage } from "./form-error";

/*
 * 응답자에게 보여 줄 문구 (ssccops-server #35 · #36).
 *
 * 운영자용 문구(form-error.ts)와 나눈 이유는 읽는 사람이 다르기 때문이다. 운영자에게는
 * "폼을 찾을 수 없습니다 — 이미 삭제된 폼일 수 있습니다"가 다음 행동을 알려주지만, 응답자에게
 * 폼의 삭제 여부는 알 바가 아니고 알려 줄 이유도 없다. 여기서는 **응답자가 지금 할 수 있는
 * 일**만 말한다.
 *
 * **작성·제출 문구는 이 파일에 없다**(ssccops#214). 답을 쓰는 화면(`/f/{formId}`)이 `apps/www`로
 * 옮겨 가면서 자동 저장 실패·제출 실패 문구도 함께 갔다. 이 앱에 남은 응답자 문구는 둘뿐이다 —
 * 기획안 검토 화면이 쓰는 접수 불가 안내와, 내 응답 목록(`use-my-responses`)의 조회 실패다.
 */

/** 접수 불가 안내 — DRAFT·CLOSED·기간 전·기간 후를 서버가 한 코드로 묶었으므로 문구도 하나다 */
export const FORM_NOT_ACCEPTING_MESSAGE = "지금은 응답을 받지 않는 폼입니다";

/**
 * 폼·응답 목록을 불러오지 못했을 때.
 *
 * 접수 불가(409)와 없는 폼(404)은 오류 문구가 아니라 **화면 자체가 갈리므로** 여기서 다루지
 * 않는다 — 호출부가 코드로 분기한다.
 */
export function toPublicFormLoadErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "폼을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }
  return toFormErrorMessage(error);
}
