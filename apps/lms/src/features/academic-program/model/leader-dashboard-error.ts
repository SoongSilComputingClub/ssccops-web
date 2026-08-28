import { ACADEMIC_PROGRAM_LIST_ERROR } from "@/entities/academic-program";
import { ACADEMIC_SESSION_ERROR } from "@/entities/academic-session";
import { API_ERROR, ApiError } from "@/shared/api/client";

/*
 * 스터디장 대시보드 조회 실패 → 화면에 띄울 한 줄 (#126 · 서버 #131·#134·#139).
 *
 * 화면은 `ApiError.code`로만 분기한다(#29 · AGENTS.md — 문구는 서버에서 바뀌지만 코드는
 * 계약이다). 알 수 없는 코드는 서버가 내려준 `message`를 그대로 보여 준다.
 *
 * ── 401·미가입은 여기서 문구를 만들지 않는다 ──────────────────
 * 이 앱에는 리다이렉트하는 `apiFetch`가 없다(로그인 화면이 없어 되돌아올 곳이 없다 — apps/www
 * 규약). 미로그인·토큰 만료는 화면이 공용 로그인 게이트(`LoginGate`)로, 미가입은 어드민
 * `/signup` 안내로 그린다 — 그 판정은 `isUnauthenticated`/`isSignupRequired`가 하고 이 함수는
 * 부르지 않는다.
 *
 * 오류 문구는 **원인 + 다음 행동** 순서로, 부연은 대시(—)로 잇는다(#117).
 */
export function toLeaderDashboardErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "학술 대시보드를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case ACADEMIC_SESSION_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "활동을 찾을 수 없습니다 — 아직 이관되지 않았거나 삭제된 활동일 수 있습니다";
    case ACADEMIC_SESSION_ERROR.FORBIDDEN:
      return "이 활동의 정보를 볼 권한이 없습니다 — 활동의 스터디장만 볼 수 있습니다";
    case ACADEMIC_PROGRAM_LIST_ERROR.VALIDATION_FAILED:
    case ACADEMIC_PROGRAM_LIST_ERROR.INVALID_CODE_VALUE:
      return "목록 조건이 서버 기준과 다릅니다. 화면을 새로고침해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "서버 주소가 설정되지 않아 학술 대시보드를 불러올 수 없습니다";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
