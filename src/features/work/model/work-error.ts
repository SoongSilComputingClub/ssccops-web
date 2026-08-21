import { WORK_ERROR } from "@/entities/work";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 업무 조회 실패 → 화면에 띄울 한 줄.
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. 남은 403은 **권한 부족**이다 — 업무 API는 조회까지 WORK_MANAGE로
 * 막혀 있어(서버 #9) 가입한 회원도 권한이 없으면 목록을 못 본다. 서버 문장("권한이
 * 없습니다")만으로는 무엇을 해야 할지 알 수 없으므로 여기서 다시 쓴다.
 *
 * 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 임의로 뭉개면 원인을 알려주려고
 * 서버가 내려보낸 문장이 사라진다.
 */
export function toWorkErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "업무 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    /*
     * 상태(403)가 아니라 코드로 본다(#29). 403에는 미가입(SIGNUP_REQUIRED)도 실려 오는데
     * 그쪽은 apiFetch가 이미 가입 화면으로 보낸 뒤라, 상태로만 보면 여기 문장이 잘못 뜬다.
     */
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "업무를 볼 권한이 없습니다 — 운영진 권한(WORK_MANAGE)이 필요합니다";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/**
 * 업무 등록 실패 → 화면에 띄울 한 줄 (OPS-002).
 *
 * `VALIDATION_FAILED`는 서버 문장을 그대로 쓴다 — 담당자 부적격("담당자로 지정할 수 없는
 * 회원입니다")과 기간 역전("종료 일시는 시작 일시보다 빠를 수 없습니다")이 같은 코드로
 * 오기 때문에, 여기서 한 문장으로 뭉개면 어느 칸을 고쳐야 하는지가 사라진다.
 */
export function toWorkCreateErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "업무를 등록하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  if (error.code === API_ERROR.FORBIDDEN || error.code === API_ERROR.ACCESS_DENIED) {
    return "업무를 등록할 권한이 없습니다 — 운영진 권한(WORK_MANAGE)이 필요합니다";
  }

  if (error.code === WORK_ERROR.INVALID_CODE_VALUE) {
    return "업무 유형·우선순위 값이 서버 기준 코드와 다릅니다. 화면을 새로고침해주세요";
  }

  return toWorkErrorMessage(error);
}

/**
 * 업무 삭제 실패 → 화면에 띄울 한 줄 (서버 #125).
 *
 * 403은 조회(WORK_MANAGE 없음)와 다른 뜻이다 — 삭제는 담당자 본인이어도 WORK_DELETE가
 * 따로 없으면 막힌다(소유권을 보지 않는 판정). 409 ALREADY_DELETED는 화면을 열어 둔 사이
 * 다른 사람이 먼저 지운 경우라 '다시 불러오기'가 할 일이다.
 */
export function toWorkDeleteErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "업무를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "업무를 삭제할 권한이 없습니다 — 업무 삭제(WORK_DELETE) 권한이 필요합니다";
    case WORK_ERROR.WORK_NOT_FOUND:
      return "업무를 찾을 수 없습니다. 이미 삭제됐을 수 있습니다";
    case WORK_ERROR.ALREADY_DELETED:
      return "이미 삭제된 업무입니다";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
