import { ACADEMIC_PROGRAM_ERROR } from "@/entities/academic-program";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 프로그램 상태가 쓰기를 막았을 때의 한 줄 — 전이(모집 시작·종료·재시작·폐지·복원)와 모집
 * 쓰기(선발·일정)가 함께 쓴다 (#715 · #741).
 *
 * 네 코드는 «무엇을 하려 했나»와 무관하게 같은 사실을 말한다 — 프로그램이 없거나, 그 사이 상태가
 * 바뀌었거나, 종료·폐지됐다. `recruitment-error.ts`가 먼저 이 코드들을 다뤘는데 전이 오류 매핑이
 * 같은 문장을 한 벌 더 가지면 한쪽 문구만 바뀐다. 그래서 두 매핑이 이 함수를 먼저 부르고, 다루지
 * 않는 코드(`null`)면 자기 문구로 잇는다.
 *
 * `ACADEMIC_PROGRAM_COMPLETED`(ADR-0057 · 서버 #597)·`ACADEMIC_PROGRAM_DISCONTINUED`(ADR-0058 ·
 * 서버 #611)는 새로고침으로 풀리지 않는다 — 쓰려면 각각 재시작·복원해야 해서 그것을 안내한다.
 * 서버가 코드를 둘로 나눈 이유가 이 문장이다.
 */
export function toProgramStateErrorMessage(error: ApiError): string | null {
  switch (error.code) {
    case ACADEMIC_PROGRAM_ERROR.INVALID_ACADEMIC_PROGRAM_TRANSITION:
      return "이미 상태가 바뀐 프로그램입니다 — 새로고침해주세요";
    case ACADEMIC_PROGRAM_ERROR.ACADEMIC_PROGRAM_COMPLETED:
      return "종료된 프로그램입니다 — 프로그램을 재시작한 뒤 처리해주세요";
    case ACADEMIC_PROGRAM_ERROR.ACADEMIC_PROGRAM_DISCONTINUED:
      return "폐지된 프로그램입니다 — 프로그램을 복원한 뒤 처리해주세요";
    case ACADEMIC_PROGRAM_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "프로그램이 없습니다 — 목록을 새로고침해주세요";
    default:
      return null;
  }
}

/**
 * 종료 승인·재시작·폐지·복원 실패 → 화면에 띄울 한 줄 (#715 · #741 · 서버 #133·#597·#611).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch 가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. 두 전이 모두 ACADEMIC_PROGRAM_MANAGE 를 요구한다 — 403 은 상태가 아니라
 * **코드로 분기한다**(#29).
 *
 * `VALIDATION_FAILED`는 따로 받지 않는다. 이 경로에서 그 코드는 대개 `transitionAcademicProgram`이
 * 응답에 상태가 없을 때 스스로 세우는 것이고, 그 문장(«저장됐습니다 — 새로고침하면 반영됩니다»)이
 * 사실이라 그대로 보여 준다.
 *
 * 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 임의로 뭉개면 원인을 알려주려고 서버가
 * 내려보낸 문장이 사라진다.
 */
export function toProgramTransitionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "프로그램 상태를 바꾸지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  const stateMessage = toProgramStateErrorMessage(error);
  if (stateMessage) return stateMessage;

  switch (error.code) {
    // 시트가 빈 사유로는 확인 버튼을 잠그므로 여기까지 오면 공백만 들어간 경우다
    case ACADEMIC_PROGRAM_ERROR.DISCONTINUATION_REASON_REQUIRED:
      return "폐지 사유가 없습니다 — 사유를 입력해주세요";
    case ACADEMIC_PROGRAM_ERROR.AUTHORITY_REQUIRED:
    case ACADEMIC_PROGRAM_ERROR.FORBIDDEN:
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "프로그램 상태를 바꿀 권한이 없습니다 — 학술 프로그램 관리(ACADEMIC_PROGRAM_MANAGE) 권한이 필요합니다";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
