import { SUB_WORK_TYPE_ERROR } from "@/entities/sub-work-type";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 하위 업무 유형 조회 실패 → 화면에 띄울 한 줄 (OPS-018).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. 남은 403은 **권한 부족**이다 — 목록 조회에도 `SUB_WORK_TYPE_READ`가
 * 걸려 있어(서버 #9) 가입한 회원도 권한이 없으면 표를 못 본다.
 *
 * 403은 상태가 아니라 **코드로 분기한다**(#29). 상태(403)로만 보면 SIGNUP_REQUIRED까지 같은
 * 문장을 받게 되는데, 그쪽은 apiFetch가 이미 가입 화면으로 보낸 뒤라 잘못된 안내가 된다.
 *
 * 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 임의로 뭉개면 원인을 알려주려고 서버가
 * 내려보낸 문장이 사라진다.
 */
export function toSubWorkTypeErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "하위 업무 유형을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "하위 업무 유형을 볼 권한이 없습니다 — 국장 이상 권한이 필요합니다";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/**
 * 유형 등록·수정·사용 전환 실패 → 화면에 띄울 한 줄 (OPS-019).
 *
 * 조회와 문구가 갈리는 자리는 403 하나다. 등록·수정·토글에는 `SUB_WORK_TYPE_MANAGE`가
 * 걸려 있어(회장·부회장·총무) **목록은 보이는데 저장만 막히는 상태가 정상적으로 존재한다** —
 * 조회와 같은 "국장 이상" 문구를 쓰면 국장이 자기 권한을 의심하게 된다.
 *
 * `VALIDATION_FAILED`는 서버 문장을 그대로 쓴다 — 유형_명 누락과 승인 정책 조합 오류("승인
 * 정책 설정이 올바르지 않습니다")가 같은 코드로 오기 때문에, 한 문장으로 뭉개면 어느 칸을
 * 고쳐야 하는지가 사라진다.
 */
export function toSubWorkTypeSaveErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "하위 업무 유형을 저장하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "하위 업무 유형을 관리할 권한이 없습니다 — 회장·부회장·총무만 할 수 있습니다";
    // 클라이언트 선검사와 같은 문구를 쓴다 — 어디서 걸렸든 사용자에게는 같은 말이어야 한다
    case SUB_WORK_TYPE_ERROR.DUPLICATE_SUB_WORK_TYPE_NAME:
      return "이미 있는 유형_명입니다";
    case SUB_WORK_TYPE_ERROR.SUB_WORK_TYPE_NOT_FOUND:
      return "이미 없는 유형입니다. 목록을 다시 불러옵니다";
    case SUB_WORK_TYPE_ERROR.INVALID_CODE_VALUE:
      return "승인자_역할_코드가 서버 기준 코드와 다릅니다. 화면을 새로고침해주세요";
    default:
      return toSubWorkTypeErrorMessage(error);
  }
}
