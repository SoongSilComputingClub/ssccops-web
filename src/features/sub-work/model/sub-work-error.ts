import { SUB_WORK_ERROR } from "@/entities/sub-work";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 하위 업무 등록 실패 → 화면에 띄울 한 줄 (OPS-007).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. 남은 403은 **권한 부족**이다 — 하위 업무 등록은 상위 업무와 같은
 * `WORK_MANAGE`다(서버 SubWorkController 클래스 애노테이션). 403은 상태가 아니라 **코드로
 * 분기한다**(#29) — 상태로만 보면 SIGNUP_REQUIRED까지 이 문장을 받는다.
 *
 * `VALIDATION_FAILED`와 `NOT_FOUND`는 **서버 문장을 그대로 쓴다.** 한 코드에 여러 사유가
 * 겹치기 때문이다:
 *
 * - VALIDATION_FAILED — 담당자 부적격("담당자로 지정할 수 없는 회원입니다") · 기간 역전
 *   ("종료 일시는 시작 일시보다 빠를 수 없습니다") · 꺼진 유형("사용하지 않는 하위 업무
 *   유형입니다")
 * - NOT_FOUND — 없는 상위 업무("업무를 찾을 수 없습니다") · 없는 유형("하위 업무 유형을
 *   찾을 수 없습니다")
 *
 * 여기서 한 문장으로 뭉개면 어느 칸을 고쳐야 하는지가 사라진다 (업무 등록이 같은 판단을 했다).
 */
export function toSubWorkCreateErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "하위 업무를 등록하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "하위 업무를 등록할 권한이 없습니다 — 운영진 권한(WORK_MANAGE)이 필요합니다";
    case SUB_WORK_ERROR.INVALID_CODE_VALUE:
      return "우선_순위 값이 서버 기준 코드와 다릅니다. 화면을 새로고침해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
