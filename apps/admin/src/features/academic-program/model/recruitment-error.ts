import {
  ACADEMIC_PROGRAM_ERROR,
  RECRUITMENT_ERROR,
} from "@/entities/academic-program";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 모집 시작·신청자 조회·선발 실패 → 화면에 띄울 한 줄 (#127 · 서버 #133·#138).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch 가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. 신청자 조회는 소유권 또는 ACADEMIC_PROGRAM_MANAGE, 모집 시작·선발은
 * ACADEMIC_PROGRAM_MANAGE 를 요구하므로 권한 없는 회원이 주소로 들어오면 403 이 온다 —
 * 상태가 아니라 **코드로 분기한다**(#29).
 *
 * `RECRUITMENT_NOT_STARTED`(신청자 조회·선발을 모집 시작 전에 부름)는 재시도가 아니라
 * "모집을 먼저 시작하세요"를 안내한다. `FORM_HAS_NO_QUESTION`(문항 0개 폼으로 모집 시작)은
 * 이슈가 지정한 문구 그대로 — 폼 편집 화면에서 문항을 먼저 등록하라고 밝힌다.
 *
 * **모집 시작은 폼 도메인 오류를 그대로 전파하므로 그 코드를 여기서 받아야 한다.** 빠뜨리면
 * default 로 떨어져 서버 원문이 화면에 그대로 뜬다 — `INVALID_FORM_STATUS_TRANSITION` 이
 * 실제로 그렇게 새어 "허용되지 않는 폼 상태 전이입니다"가 토스트에 찍혔다(개발 용어 노출 ·
 * 다음 행동 없음 — AGENTS.md 화면 문구 규칙 위반). 그 상태는 활동이 승인인데 폼만 열려 있는
 * 정합성 붕괴라 사용자가 화면에서 풀 수 없어, 새로고침이 아니라 담당자 문의로 안내한다.
 *
 * 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 임의로 뭉개면 원인을 알려주려고 서버가
 * 내려보낸 문장이 사라진다.
 */
export function toRecruitmentErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "모집 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case ACADEMIC_PROGRAM_ERROR.AUTHORITY_REQUIRED:
    case ACADEMIC_PROGRAM_ERROR.FORBIDDEN:
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "모집을 관리할 권한이 없습니다 — 스터디·프로젝트 관리(ACADEMIC_PROGRAM_MANAGE) 권한이 필요합니다";
    case RECRUITMENT_ERROR.RECRUITMENT_NOT_STARTED:
      return "아직 모집이 시작되지 않았습니다 — 모집 기간을 정해 먼저 모집을 시작해주세요";
    case RECRUITMENT_ERROR.FORM_HAS_NO_QUESTION:
      return "신청서에 문항이 없어 모집을 시작할 수 없습니다 — 폼 편집 화면에서 문항을 먼저 등록하세요";
    case RECRUITMENT_ERROR.INVALID_FORM_STATUS_TRANSITION:
      return "신청서가 이미 접수 중이라 모집을 시작할 수 없습니다 — 학술 담당자에게 문의해주세요";
    case ACADEMIC_PROGRAM_ERROR.INVALID_ACADEMIC_PROGRAM_TRANSITION:
      return "이미 모집이 시작됐거나 처리된 활동입니다 — 화면을 새로고침해주세요";
    case ACADEMIC_PROGRAM_ERROR.FORM_NOT_LINKED:
      return "이 활동에 연결된 신청서가 없습니다 — 학술 담당자에게 문의해주세요";
    case ACADEMIC_PROGRAM_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "활동을 찾을 수 없습니다 — 이미 삭제됐거나 주소가 잘못됐을 수 있습니다";
    case ACADEMIC_PROGRAM_ERROR.VALIDATION_FAILED:
    case ACADEMIC_PROGRAM_ERROR.INVALID_CODE_VALUE:
      return "목록 조건이 서버 기준과 다릅니다. 화면을 새로고침해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
