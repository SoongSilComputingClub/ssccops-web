import { ACADEMIC_PROGRAM_MEMBER_ERROR } from "@/entities/academic-program";
import { API_ERROR, ApiError } from "@/shared/api/client";
import { AUTH_ERROR } from "@/shared/api/auth-error";

/**
 * 팀원 목록 조회 실패 → 화면에 띄울 한 줄 (#131 · 서버 #138).
 *
 * 화면은 `ApiError.code`로만 분기한다(#29 · AGENTS.md — 문구는 서버에서 바뀌지만 코드는
 * 계약이다). 알 수 없는 코드는 서버가 내려준 `message`를 그대로 보여 준다 — 임의로 뭉개면
 * 원인을 알려주려고 서버가 실어 보낸 문장이 사라진다.
 *
 * ── 401·미가입은 여기서 문구를 만들지 않는다 ──────────────────
 * 이 앱에는 리다이렉트하는 `apiFetch`가 없다(로그인 화면이 없어 되돌아올 곳이 없다 — apps/www
 * 규약). 미로그인(`CLIENT_UNAUTHENTICATED`)·토큰 만료(401)는 화면이 공용 로그인 게이트
 * (`LoginGate`)로 그리고, 미가입(`SIGNUP_REQUIRED`)은 어드민 `/signup` 안내로 그린다 —
 * 그 판정은 `isUnauthenticated`/`isSignupRequired`가 하고 이 함수는 부르지 않는다.
 */
export function toAcademicProgramMembersErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "팀원 명단을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case ACADEMIC_PROGRAM_MEMBER_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "활동을 찾을 수 없습니다 — 주소가 잘못됐거나 아직 이관되지 않은 활동일 수 있습니다";
    case ACADEMIC_PROGRAM_MEMBER_ERROR.VALIDATION_FAILED:
    case ACADEMIC_PROGRAM_MEMBER_ERROR.INVALID_CODE_VALUE:
      return "목록 조건이 서버 기준과 다릅니다. 화면을 새로고침해주세요";
    case AUTH_ERROR.SIGNUP_REQUIRED:
      // 여기까지 오면 각 화면이 가입 안내로 갈랐어야 하는 코드다 — 그래도 오면 일반 문구로 받는다
      return "회원만 볼 수 있는 화면입니다";
    case API_ERROR.CONFIG_MISSING:
      return "서버 주소가 설정되지 않아 팀원 명단을 불러올 수 없습니다";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
