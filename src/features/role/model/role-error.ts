import { ROLE_CLASSIFICATION_ERROR, ROLE_ERROR } from "@/entities/role";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/*
 * 역할·역할 분류 화면의 오류 코드 → 사람이 읽을 한 줄 (#49 · 서버 #79 · #80).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch 가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 임의로 뭉개면
 * 원인을 알려주려고 서버가 내려보낸 문장이 사라진다.
 *
 * 서버 문장을 다시 쓰는 코드들이 있다. 서버는 "왜 거절했는가" 를 말하지만 이 화면의 사용자가
 * 알아야 할 것은 **다음에 무엇을 해야 하는가**이기 때문이다.
 */

/** 조회·변경 공통. 어느 화면에서 났든 같은 말이어야 하는 것들만 여기 둔다 */
function toCommonMessage(error: ApiError): string {
  switch (error.code) {
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    /*
     * 역할 API 는 조회까지 ROLE_MANAGE 를 요구한다. 화면은 진입 전에 이미 막지만, 보고 있는
     * 사이에 권한이 회수되면 여기로 온다 — 그때는 화면 탓이 아니라는 것을 알려야 한다.
     */
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "역할을 다룰 권한(ROLE_MANAGE)이 없습니다 — 최고관리자에게 요청해주세요";
    default:
      return error.message;
  }
}

/** 역할 조회·생성·수정·삭제 실패 → 화면에 띄울 한 줄 */
export function toRoleErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "역할 정보를 처리하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    /*
     * 이름 중복 판정의 **유일한** 근거다. 예전에는 화면이 목록을 훑어 먼저 막았는데, 그
     * 목록은 이 브라우저가 마지막으로 받은 것이라 그 사이에 만들어진 역할을 알지 못했다.
     */
    case ROLE_ERROR.ROLE_NAME_DUPLICATED:
      return "이미 같은 이름의 역할이 있습니다 — 다른 이름을 써주세요";
    /*
     * '쓰이고 있다' 는 두 가지다 — 배정 이력이 남아 있거나(종료된 배정도 이력이다) 권한이
     * 붙어 있거나. 화면에 삭제 버튼을 두지 않았으므로 이 문구는 사실상 뜨지 않지만, 나중에
     * 삭제를 여는 사람이 무엇을 안내해야 하는지 알 수 있게 남긴다.
     */
    case ROLE_ERROR.ROLE_IN_USE:
      return "한 번이라도 배정됐거나 권한이 붙어 있는 역할은 지울 수 없습니다 — 이름을 바꿔 계속 쓰거나 그대로 두세요";
    case ROLE_ERROR.ROLE_NOT_FOUND:
      return "없는 역할입니다. 다른 곳에서 이미 지웠을 수 있어 목록으로 돌아갑니다";
    case ROLE_ERROR.ROLE_CLASSIFICATION_NOT_FOUND:
      return "없는 역할 분류입니다. 분류가 그 사이에 바뀐 것 같아 다시 불러옵니다";
    // 어느 칸이 왜 틀렸는지를 서버 문장이 담고 있다 — 뭉개면 입력란 옆에 붙일 말이 사라진다
    case ROLE_ERROR.VALIDATION_FAILED:
      return error.message;
    default:
      return toCommonMessage(error);
  }
}

/**
 * 역할 분류 조회·생성·수정·삭제 실패 → 화면에 띄울 한 줄.
 *
 * 분류 조회에는 권한이 필요 없으므로(변경만 ROLE_MANAGE) 403 은 변경에서만 온다 — 문구도
 * "볼 수 없다" 가 아니라 "바꿀 수 없다" 여야 한다.
 */
export function toRoleClassificationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "역할 분류를 처리하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "역할 분류를 바꿀 권한(ROLE_MANAGE)이 없습니다 — 조회만 할 수 있습니다";
    case ROLE_CLASSIFICATION_ERROR.SYSTEM_ROLE_CLASSIFICATION_IMMUTABLE:
      return "SYSTEM 분류는 이름을 바꾸거나 지울 수 없습니다 — 최고관리자 역할이 매달려 있어 모든 권한 확인의 기준이 되는 분류입니다";
    case ROLE_CLASSIFICATION_ERROR.ROLE_CLASSIFICATION_CODE_DUPLICATED:
      return "이미 있는 분류 코드입니다 — 다른 코드를 써주세요";
    /*
     * 화면이 roleCount 로 먼저 잠그지만 그 숫자는 낡을 수 있다 — 다른 사람이 방금 역할을
     * 이 분류로 옮겼으면 여기로 온다. 무엇을 먼저 해야 하는지를 짚어 준다.
     */
    case ROLE_CLASSIFICATION_ERROR.ROLE_CLASSIFICATION_IN_USE:
      return "이 분류를 쓰는 역할이 있어 지울 수 없습니다 — 역할을 다른 분류로 먼저 옮겨주세요";
    case ROLE_CLASSIFICATION_ERROR.ROLE_CLASSIFICATION_NOT_FOUND:
      return "없는 분류입니다. 다른 곳에서 이미 지웠을 수 있어 목록을 다시 불러옵니다";
    case ROLE_CLASSIFICATION_ERROR.VALIDATION_FAILED:
      return error.message;
    default:
      return toCommonMessage(error);
  }
}
