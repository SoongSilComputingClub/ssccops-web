import { MEMBER_ERROR, MEMBER_ROSTER_ERROR } from "@/entities/member";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/*
 * 회원명부 내려받기 실패 → 화면에 띄울 한 줄 (#785 · 서버 #674).
 *
 * 거절은 파일이 아니라 봉투로 온다(`apiFetchFile`). 그래서 실패한 응답이 파일로 저장되는 일은
 * 없고, 여기서는 그 봉투의 코드를 문장으로 바꾸기만 한다.
 */

/** 권한이 없을 때의 문장 — 화면의 진입 안내와 403 문구가 같은 문장이어야 해서 한 곳에 둔다 */
export const ROSTER_EXPORT_FORBIDDEN_MESSAGE =
  "회원명부를 내려받을 권한이 없습니다 — 회원 관리(MEMBER_MANAGE) 권한이 필요합니다";

export function toMemberRosterExportErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "회원명부를 내려받지 못했습니다 — 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    /*
     * 409 — 오늘 유효한 회장이 없다. 서버 문장이 «역할 관리에서 회장을 배정한 뒤 다시
     * 내려받으세요»까지 말하므로 그대로 옮기고, 화면은 그 옆에 역할 관리 링크만 둔다
     * (`isRosterPresidentMissing`).
     */
    case MEMBER_ROSTER_ERROR.PRESIDENT_MISSING:
      return error.message;
    /*
     * 400 — 연도·학기가 비었거나 범위 밖이다. 화면이 고를 수 있는 값만 내놓으므로 여기까지
     * 왔다면 화면과 서버의 판정이 갈린 것이다 — 지어낸 문장 대신 서버의 사유를 보인다.
     */
    case MEMBER_ERROR.VALIDATION_FAILED:
      return error.message;
    /*
     * 400 — 기준 코드에 없는 상태·표기법이다. 상태 선택지는 `GET /v1/member-statuses`에서 오므로
     * 이 코드는 화면을 연 뒤 기준 코드가 바뀌었다는 뜻이다(회원 목록 필터와 같은 문장).
     */
    case MEMBER_ERROR.INVALID_CODE_VALUE:
      return "선택지가 바뀌었습니다 — 새로고침해주세요";
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return ROSTER_EXPORT_FORBIDDEN_MESSAGE;
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다 — 잠시 후 다시 시도해주세요";
    default:
      // 모르는 코드는 서버 문장을 그대로 옮긴다 — 뭉개면 원인을 알리려고 보낸 문장이 사라진다
      return error.message;
  }
}

/**
 * 미리보기 실패 → 한 줄. 서버가 돌려준 거절은 내려받기와 같은 코드라 같은 문장이고, 다른 것은
 * 응답을 받지 못한 경우의 문장뿐이다(«내려받지 못했습니다»는 누르지 않은 사람에게 틀린 말이다).
 */
export function toMemberRosterPreviewErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "인원을 불러오지 못했습니다 — 새로고침해주세요";
  }
  return toMemberRosterExportErrorMessage(error);
}

/** 회장이 없어 거절됐는가 — 화면이 오류 문구 옆에 «역할 관리» 링크를 둘지 정한다 */
export function isRosterPresidentMissing(error: unknown): boolean {
  return error instanceof ApiError && error.code === MEMBER_ROSTER_ERROR.PRESIDENT_MISSING;
}
