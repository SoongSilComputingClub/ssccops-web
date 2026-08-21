import { MEETING_ERROR } from "@/entities/meeting";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 회의 조회 실패 → 화면에 띄울 한 줄 (OPS-025 · OPS-031).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. 남은 403은 **권한 부족**이다 — 회의 API는 조회까지 MEETING_MANAGE로
 * 막혀 있어(서버 #9) 가입한 회원도 권한이 없으면 목록·상세를 못 본다.
 *
 * 404는 여기까지 오지 않는다 — 상세 조회 훅이 오류가 아니라 '없는 회의' 상태로 나눠 다룬다
 * (features/work의 toWorkErrorMessage와 같은 규칙).
 */
export function toMeetingErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "회의 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "회의를 볼 권한이 없습니다 — 운영진 권한(MEETING_MANAGE)이 필요합니다";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/**
 * 회의 삭제 실패 → 화면에 띄울 한 줄 (서버 #125).
 *
 * 403은 toMeetingActionErrorMessage의 "회의 책임자만"과 다른 뜻이다 — 삭제는 의장 본인이어도
 * MEETING_DELETE가 따로 없으면 막힌다(소유권을 보지 않는 판정). 409 ALREADY_DELETED는 화면을
 * 열어 둔 사이 다른 사람이 먼저 지운 경우다.
 */
export function toMeetingDeleteErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "회의를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "회의를 삭제할 권한이 없습니다 — 회의 삭제(MEETING_DELETE) 권한이 필요합니다";
    case MEETING_ERROR.NOT_FOUND:
      return "회의를 찾을 수 없습니다. 이미 삭제됐을 수 있습니다";
    case MEETING_ERROR.ALREADY_DELETED:
      return "이미 삭제된 회의입니다";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/**
 * 회의 등록 실패 → 화면에 띄울 한 줄 (OPS-024).
 *
 * `VALIDATION_FAILED`는 서버 문장을 그대로 쓴다 — 담당자 부적격("담당자로 지정할 수 없는
 * 회원입니다") · 기간 역전("종료 일시는 시작 일시보다 빠를 수 없습니다") · 안건 연결 규칙
 * 위반("연결할 운영 건 또는 안건명 중 하나만 입력해야 합니다")이 같은 코드로 오기 때문에,
 * 여기서 한 문장으로 뭉개면 어느 칸을 고쳐야 하는지가 사라진다(업무 등록과 같은 판단).
 */
export function toMeetingCreateErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "회의를 등록하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  if (error.code === API_ERROR.FORBIDDEN || error.code === API_ERROR.ACCESS_DENIED) {
    return "회의를 등록할 권한이 없습니다 — 운영진 권한(MEETING_MANAGE)이 필요합니다";
  }

  if (error.code === MEETING_ERROR.INVALID_CODE_VALUE) {
    return "회의 구분·참석 대상·우선순위 값이 서버 기준 코드와 다릅니다. 화면을 새로고침해주세요";
  }

  return toMeetingErrorMessage(error);
}

/**
 * 상태 전이·안건 처리 실패 → 화면에 띄울 한 줄 (OPS-026 · OPS-027 · OPS-028 · OPS-029).
 *
 * 403은 두 가지가 겹친다 — 화면 권한(MEETING_MANAGE)이 없거나, 있어도 **개회·회의록작성·
 * 종료를 의장이 아닌 회원이 시도한** 경우다(서버가 두 뜻에 같은 FORBIDDEN 문자열을 쓴다).
 * 회의 상세를 볼 수 있는 사람이 여기서 403을 받았다면 대개 후자라, 문구도 그쪽을 앞세운다.
 *
 * 409 세 코드는 **화면이 이미 막고 있어야 하는 상태**다. 그래도 문구를 두는 것은 화면을 열어
 * 둔 사이 다른 사람이 상태를 바꿨을 때 여기로 떨어지기 때문이며, 그때 할 일은 '다시
 * 불러오기'라 문구도 그렇게 적는다(sub-work-error.ts와 같은 규칙).
 */
export function toMeetingActionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "처리하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "회의 책임자만 할 수 있는 작업입니다";
    case MEETING_ERROR.NOT_FOUND:
      return "대상을 찾을 수 없습니다. 이미 삭제됐을 수 있으니 화면을 다시 불러와주세요";
    case MEETING_ERROR.TRANSITION_NOT_ALLOWED:
      return "지금 상태에서는 할 수 없는 작업입니다. 그 사이 상태가 바뀌었을 수 있으니 다시 불러와주세요";
    case MEETING_ERROR.AGENDA_UNRESOLVED:
      return "처리하지 않은(미처리) 안건이 있습니다 — 보류로 표시하거나 처리한 뒤 종료해주세요";
    case MEETING_ERROR.MEETING_CLOSED:
      return "이미 종료되었거나 취소된 회의입니다";
    case MEETING_ERROR.REASON_REQUIRED:
      return "취소 사유를 입력해주세요";
    case MEETING_ERROR.VALIDATION_FAILED:
      return "연결할 운영 건 또는 안건명 중 하나만 입력해야 합니다";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
