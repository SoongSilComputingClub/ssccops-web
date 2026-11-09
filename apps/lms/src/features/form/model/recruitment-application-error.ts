import { RECRUITMENT_APPLICATION_ERROR } from "@/entities/form";
import { API_ERROR, ApiError } from "@/shared/api/client";
import { AUTH_ERROR } from "@/shared/api/auth-error";

/*
 * 지원자 목록·지원서 상세 조회 실패 → 화면에 띄울 한 줄 (#826 · ssccops#625 · server#704).
 *
 * 화면은 `ApiError.code`로만 분기한다(AGENTS.md). 알 수 없는 코드는 서버 `message`를 그대로 보인다 —
 * 서버 리더 경로가 아직 배포되지 않은 환경에서 상세가 받는 404·405도 그 자리로 떨어진다.
 *
 * 조회뿐이라 함수가 하나다 — 이 화면에는 저장이 없다(선발은 학술국장이 어드민에서 한다).
 */
export function toRecruitmentApplicationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "지원서를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case RECRUITMENT_APPLICATION_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "프로그램이 없습니다 — 모집 관리 목록을 새로고침해주세요";
    case RECRUITMENT_APPLICATION_ERROR.FORBIDDEN:
      return "이 프로그램의 리더만 지원서를 볼 수 있습니다";
    case RECRUITMENT_APPLICATION_ERROR.RECRUITMENT_NOT_STARTED:
      return "아직 접수가 시작되지 않았습니다 — 접수가 열린 뒤 다시 확인해주세요";
    case RECRUITMENT_APPLICATION_ERROR.FORM_NOT_LINKED:
      // 승인 이관이 폼을 붙여 주므로 정상 흐름에서는 나오지 않는다 — 화면에서 풀 길이 없어 문의로 보낸다
      return "이 프로그램에 연결된 지원서가 없습니다 — 학술 담당자에게 문의해주세요";
    case RECRUITMENT_APPLICATION_ERROR.FORM_RESPONSE_NOT_FOUND:
      return "지원서가 없습니다 — 지원자 목록을 새로고침해주세요";
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
