import { SUB_WORK_ERROR } from "@/entities/sub-work";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 하위 업무 조회 실패 → 화면에 띄울 한 줄 (OPS-009).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. 남은 403은 **권한 부족**이다 — 하위 업무 API는 조회까지 WORK_MANAGE로
 * 막혀 있어(서버 #9) 가입한 회원도 권한이 없으면 상세를 못 본다.
 *
 * 404는 여기까지 오지 않는다 — 조회 훅이 오류가 아니라 '없는 하위 업무' 상태로 나눠 다룬다.
 *
 * 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 임의로 뭉개면 원인을 알려주려고
 * 서버가 내려보낸 문장이 사라진다 (업무 도메인 toWorkErrorMessage와 같은 규칙).
 */
export function toSubWorkErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "하위 업무를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    // 상태(403)가 아니라 코드로 본다(#29) — 403에는 미가입(SIGNUP_REQUIRED)도 실려 온다
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "하위 업무를 볼 권한이 없습니다 — 운영진 권한(WORK_MANAGE)이 필요합니다";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/**
 * 상태 전이·체크 실패 → 화면에 띄울 한 줄 (OPS-010 · OPS-013).
 *
 * 조회와 문구를 나누는 이유는 같은 코드가 다른 뜻이 되기 때문이다:
 *
 * - **403** — 조회에서는 "볼 권한이 없다"지만 여기서는 두 가지가 겹친다. 화면 권한
 *   (WORK_MANAGE)이 없거나, 있어도 **이 건의 승인자가 아닌** 경우다(서버가 두 뜻에 같은
 *   `FORBIDDEN` 문자열을 쓴다). 상세를 볼 수 있는 사람이 여기서 403을 받았다면 대개 후자라,
 *   문구도 승인자 쪽을 앞세운다.
 * - **404** — 조회에서는 '없는 하위 업무'지만 여기서는 **체크리스트 항목**일 수도 있다.
 *   경로의 하위 업무에 속하지 않는 항목도 같은 코드로 온다(서버가 403으로 나누지 않는다).
 *
 * 409 세 코드는 **화면이 이미 막고 있어야 하는 상태**다. 그래도 문구를 두는 것은 화면을 열어
 * 둔 사이 다른 사람이 상태를 바꿨을 때 여기로 떨어지기 때문이며, 그때 사용자가 할 일은
 * '다시 불러오기'라 문구도 그렇게 적는다.
 */
export function toSubWorkActionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "처리하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "이 하위 업무의 승인자가 아닙니다 — 유형이 지정한 승인자만 승인·반려할 수 있습니다";
    case SUB_WORK_ERROR.NOT_FOUND:
      return "대상을 찾을 수 없습니다. 이미 삭제됐을 수 있으니 화면을 다시 불러와주세요";
    case SUB_WORK_ERROR.TRANSITION_NOT_ALLOWED:
      return "지금 상태에서는 할 수 없는 작업입니다. 그 사이 상태가 바뀌었을 수 있으니 다시 불러와주세요";
    case SUB_WORK_ERROR.COMPLETION_CRITERIA_UNMET:
      return "완료 점검 목록을 모두 체크해야 완료 승인할 수 있습니다";
    case SUB_WORK_ERROR.QUORUM_NOT_MET:
      return "정족수를 채워야 완료 승인할 수 있습니다 — 승인함에서 찬성 표를 받아야 합니다";
    case SUB_WORK_ERROR.REASON_REQUIRED:
      return "반려 사유를 입력해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

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
