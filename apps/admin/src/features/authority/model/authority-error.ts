import { AUTHORITY_ERROR } from "@/entities/authority";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/*
 * 권한 관리 화면의 오류 코드 → 사람이 읽을 한 줄 (#32 · 서버 #65).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch 가 이미 리다이렉트까지 끝내므로 여기서
 * 다루지 않는다. 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 임의로 뭉개면 원인을
 * 알려주려고 서버가 내려보낸 문장이 사라진다.
 *
 * 서버 문장을 그대로 쓰지 않고 다시 쓰는 코드들이 있다. 서버는 "왜 거절했는가" 를 말하지만
 * 이 화면의 사용자가 알아야 할 것은 **다음에 무엇을 해야 하는가**이기 때문이다.
 */

/** 조회·수정 공통. 어느 화면에서 났든 같은 말이어야 하는 것들만 여기 둔다 */
function toCommonMessage(error: ApiError): string {
  switch (error.code) {
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    /*
     * 권한 관리 API 는 조회까지 ROLE_MANAGE 를 요구한다. 화면은 진입 전에 이미 막지만, 보고
     * 있는 사이에 권한이 회수되면 여기로 온다 — 그때는 화면 탓이 아니라는 것을 알려야 한다.
     */
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "권한 관리(ROLE_MANAGE) 권한이 없습니다 — 최고관리자에게 요청해주세요";
    default:
      return error.message;
  }
}

/** 권한 트리 조회·생성·수정·삭제 실패 → 화면에 띄울 한 줄 */
export function toAuthorityErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "권한 정보를 처리하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case AUTHORITY_ERROR.SYSTEM_AUTHORITY_IMMUTABLE:
      return "시스템 권한은 삭제하거나 코드를 바꿀 수 없습니다 — 코드가 직접 참조하는 권한입니다. 이름·설명·상위는 바꿀 수 있습니다";
    case AUTHORITY_ERROR.AUTHORITY_CODE_IMMUTABLE:
      return "권한 코드는 바꿀 수 없습니다. 새 코드로 만든 뒤 기존 권한을 삭제해주세요";
    case AUTHORITY_ERROR.AUTHORITY_CYCLE_DETECTED:
      return "자기 자신이나 하위 권한을 상위로 지정할 수 없습니다";
    /*
     * '쓰이고 있다' 는 두 가지다 — 어느 역할엔가 부여돼 있거나, 자식 권한이 달려 있거나.
     * 어느 역할이 쓰고 있는지는 서버가 알려주지 않으므로 회수·이동을 먼저 하라고 짚어 준다.
     */
    case AUTHORITY_ERROR.AUTHORITY_IN_USE:
      return "이 권한을 쓰고 있어 지울 수 없습니다 — 역할에서 먼저 회수하고, 하위 권한이 있으면 다른 상위로 옮겨주세요";
    case AUTHORITY_ERROR.AUTHORITY_CODE_DUPLICATED:
      return "이미 있는 권한 코드입니다";
    case AUTHORITY_ERROR.AUTHORITY_NOT_FOUND:
      return "없는 권한입니다. 다른 곳에서 이미 지웠을 수 있어 트리를 다시 불러옵니다";
    // 어느 칸이 왜 틀렸는지를 서버 문장이 담고 있다 — 뭉개면 입력란 옆에 붙일 말이 사라진다
    case AUTHORITY_ERROR.VALIDATION_FAILED:
      return error.message;
    default:
      return toCommonMessage(error);
  }
}

/**
 * 역할 권한 조회·교체 실패 → 화면에 띄울 한 줄.
 *
 * `CANNOT_REVOKE_OWN_ROLE_MANAGE` 는 이 화면에서 가장 길게 설명한다. 서버 문장("자신의 권한
 * 관리 권한은 회수할 수 없습니다")은 사실만 말하는데, 사용자가 알아야 할 것은 **그 조작이
 * 통과했다면 무슨 일이 벌어졌을지**다 — 권한 관리 화면 자체가 ROLE_MANAGE 를 요구하므로
 * 마지막 보유자가 스스로 회수하면 화면에서는 아무도 되돌릴 수 없고, 복구는 DB 를 직접 고치는
 * 일이 된다. 그래서 "막혔다" 가 아니라 "막아 드렸다" 로 읽혀야 하고, 정말 넘기고 싶다면
 * 다른 사람에게 ROLE_MANAGE 를 먼저 준 뒤 그 사람이 회수하면 된다는 길까지 알려 준다.
 */
export function toRoleAuthorityErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "역할 권한을 처리하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case AUTHORITY_ERROR.CANNOT_REVOKE_OWN_ROLE_MANAGE:
      return (
        "저장하지 않았습니다 — 이 저장은 당신이 가진 권한 관리(ROLE_MANAGE) 권한을 스스로 회수하는 조작입니다. " +
        "권한 관리 화면 자체가 이 권한을 요구하므로, 통과했다면 이 화면을 포함해 권한을 되돌릴 방법이 아무에게도 남지 않고 " +
        "복구하려면 데이터베이스를 직접 고쳐야 합니다. 권한 관리를 넘기려면 먼저 다른 역할에 ROLE_MANAGE 를 부여한 뒤 그쪽에서 회수해주세요"
      );
    case AUTHORITY_ERROR.ROLE_NOT_FOUND:
      return "없는 역할입니다. 역할 목록에서 다시 선택해주세요";
    case AUTHORITY_ERROR.AUTHORITY_NOT_FOUND:
      return "체크한 권한 중 없는 것이 있습니다. 권한 트리가 바뀐 것 같아 다시 불러옵니다";
    default:
      return toAuthorityErrorMessage(error);
  }
}
