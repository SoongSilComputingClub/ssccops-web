import { RECRUITMENT_FORM_ERROR } from "@/entities/form";
import { API_ERROR, ApiError } from "@/shared/api/client";
import { AUTH_ERROR } from "@/shared/api/auth-error";

/*
 * 모집 폼 조회·저장 실패 → 화면에 띄울 한 줄 (#528 · 서버 #483).
 *
 * 화면은 `ApiError.code`로만 분기한다(AGENTS.md — 문구는 서버에서 바뀌지만 코드는 계약이다).
 * 알 수 없는 코드는 서버 `message`를 그대로 보여 준다 — 뭉개면 원인을 알려주려고 서버가
 * 실어 보낸 문장이 사라진다.
 *
 * **조회와 저장을 두 함수로 나눴다.** 같은 코드라도 사용자가 할 일이 다르기 때문이다 —
 * 403은 조회에서 «볼 수 없다»이고 저장에서 «고칠 수 없다»다. 어드민 하위 업무 유형이
 * 조회·저장 문구를 두 벌로 둔 것과 같은 자리(#34).
 */

/** 조회 실패 — 화면을 못 그린다 */
export function toRecruitmentFormErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "지원서를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case RECRUITMENT_FORM_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "프로그램이 없습니다 — 모집 관리 목록을 새로고침해주세요";
    case RECRUITMENT_FORM_ERROR.FORM_NOT_LINKED:
      /*
       * 승인 이관이 폼을 붙여 주므로 정상 흐름에서는 나오지 않는다 — 나오면 화면에서 풀 길이
       * 없어 새로고침을 권하지 않는다(어드민 `INVALID_FORM_STATUS_TRANSITION`과 같은 태도).
       */
      return "이 프로그램에 연결된 지원서가 없습니다 — 학술 담당자에게 문의해주세요";
    case RECRUITMENT_FORM_ERROR.FORBIDDEN:
      return "내가 맡은 프로그램의 지원서만 볼 수 있습니다";
    case AUTH_ERROR.SIGNUP_REQUIRED:
      return "회원만 볼 수 있는 화면입니다";
    case API_ERROR.CONFIG_MISSING:
      return "지금은 지원서를 불러올 수 없습니다 — 잠시 후 다시 시도해주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/** 저장 실패 — 화면은 떠 있고 문항을 고치던 중이다 */
export function toRecruitmentFormSaveErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "저장하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case RECRUITMENT_FORM_ERROR.RECRUITMENT_FORM_NOT_EDITABLE:
      /*
       * 화면이 `isEditable`로 이미 잠그므로, 여기까지 오는 것은 **편집 화면을 열어 둔 채
       * 접수 시작 시각이 지난** 경우다 — 그래서 새로고침을 권한다.
       */
      return "접수가 시작돼 문항을 고칠 수 없습니다 — 새로고침해주세요";
    case RECRUITMENT_FORM_ERROR.QUESTION_ITEM_IN_USE:
      return "이미 응답이 있는 문항은 고칠 수 없습니다 — 새로고침해주세요";
    case RECRUITMENT_FORM_ERROR.INVALID_QUESTION_COMPOSITION:
      return "문항 구성을 저장할 수 없습니다 — 문항의 확인 필요 표시를 고쳐주세요";
    case RECRUITMENT_FORM_ERROR.FORBIDDEN:
      return "내가 맡은 프로그램의 지원서만 고칠 수 있습니다";
    case RECRUITMENT_FORM_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "프로그램이 없습니다 — 모집 관리 목록을 새로고침해주세요";
    case RECRUITMENT_FORM_ERROR.FORM_NOT_LINKED:
      return "이 프로그램에 연결된 지원서가 없습니다 — 학술 담당자에게 문의해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "지금은 저장할 수 없습니다 — 잠시 후 다시 시도해주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
