import { ACADEMIC_ATTENDANCE_ERROR } from "@/entities/academic-session";
import { AUTH_ERROR } from "@/shared/api/auth-error";
import { API_ERROR, ApiError } from "@/shared/api/client";

/*
 * 출석부 조회·정정 실패 → 화면에 띄울 한 줄 (#172 · 서버 #135·#137).
 *
 * 화면은 `ApiError.code`로만 분기한다(#29 · AGENTS.md — 문구는 서버에서 바뀌지만 코드는
 * 계약이다). 알 수 없는 코드는 서버가 내려준 `message`를 그대로 보여 준다 — 임의로 뭉개면
 * 원인을 알려주려고 서버가 실어 보낸 문장이 사라진다.
 *
 * ── 401·미가입은 여기서 문구를 만들지 않는다 ──────────────────
 * 이 앱에는 리다이렉트하는 `apiFetch`가 없다(로그인 화면이 없어 되돌아올 곳이 없다 — www 규약).
 * 미로그인·토큰 만료는 화면이 공용 로그인 게이트(`LoginGate`)로, 미가입은 어드민 `/signup`
 * 안내로 그린다 — 그 판정은 `isUnauthenticated`/`isSignupRequired`가 하고 이 함수는 부르지 않는다.
 *
 * 오류 문구는 **원인 + 다음 행동** 순서로, 부연은 대시(—)로 잇는다(#117).
 */

/** 출석부 조회(회차 목록·팀원·회차별 출석부) 실패 → 한 줄 */
export function loadAttendanceRosterErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "출석부를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case ACADEMIC_ATTENDANCE_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "활동을 찾을 수 없습니다 — 주소가 잘못됐거나 아직 이관되지 않은 활동일 수 있습니다";
    case ACADEMIC_ATTENDANCE_ERROR.SESSION_NOT_FOUND:
      return "회차를 찾을 수 없습니다 — 화면을 새로고침해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "서버 주소가 설정되지 않아 출석부를 불러올 수 없습니다";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/**
 * 출석 정정(`PATCH .../attendances`) 실패 → 한 줄.
 *
 * 정정은 브라우저에서 칸을 눌러 일어난다 — 실패하면 그 칸을 눌러 바꾸기 전 값으로 되돌린다
 * (화면 책임). 이 함수는 코드 → 문구만 옮긴다.
 */
export function correctAttendanceErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "출석을 정정하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case ACADEMIC_ATTENDANCE_ERROR.SESSION_NOT_EDITABLE:
      return "이미 승인된 회차라 출석을 바꿀 수 없습니다 — 화면을 새로고침하면 최신 상태로 열립니다";
    case ACADEMIC_ATTENDANCE_ERROR.INVALID_ATTENDANCE_TARGET:
      return "이 회차 출석부에 없는 팀원입니다 — 명단을 바꾸려면 회차 기록을 다시 제출해야 합니다";
    case ACADEMIC_ATTENDANCE_ERROR.SESSION_NOT_FOUND:
      return "회차를 찾을 수 없습니다 — 화면을 새로고침해주세요";
    case ACADEMIC_ATTENDANCE_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "활동을 찾을 수 없습니다 — 화면을 새로고침해주세요";
    case ACADEMIC_ATTENDANCE_ERROR.FORBIDDEN:
      return "이 활동의 출석을 정정할 권한이 없습니다 — 활동의 스터디장만 출석을 고칠 수 있습니다";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "서버 주소가 설정되지 않아 정정할 수 없습니다";
    case AUTH_ERROR.UNAUTHENTICATED:
    case AUTH_ERROR.UNAUTHORIZED:
      return "로그인이 만료됐습니다 — 다시 로그인한 뒤 정정해주세요";
    default:
      return error.message;
  }
}
