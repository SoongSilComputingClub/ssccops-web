import {
  ACADEMIC_SESSION_ERROR,
  SESSION_PHOTO_ERROR,
} from "@/entities/academic-session";
import { AUTH_ERROR } from "@/shared/api/auth-error";
import { API_ERROR, ApiError } from "@/shared/api/client";

/*
 * 회차 기록 조회·제출 실패 → 화면에 띄울 한 줄 (#128 · 서버 #134·#135·#137).
 *
 * 화면은 `ApiError.code`로만 분기한다(#29 · AGENTS.md — 문구는 서버에서 바뀌지만 코드는
 * 계약이다). 알 수 없는 코드는 서버가 내려준 `message`를 그대로 보여 준다.
 *
 * ── 401·미가입은 여기서 문구를 만들지 않는다 ──────────────────
 * 이 앱에는 리다이렉트하는 `apiFetch`가 없다(로그인 화면이 없어 되돌아올 곳이 없다 — www 규약).
 * 미로그인·토큰 만료는 화면이 공용 로그인 게이트(`LoginGate`)로, 미가입은 어드민 `/signup`
 * 안내로 그린다 — 그 판정은 `isUnauthenticated`/`isSignupRequired`가 하고 이 함수는 부르지 않는다.
 *
 * 오류 문구는 **원인 + 다음 행동** 순서로, 부연은 대시(—)로 잇는다(#117).
 */

/** 화면(커리큘럼·상세) 조회 실패 → 한 줄 */
export function loadSessionRecordErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "회차 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case ACADEMIC_SESSION_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "활동을 찾을 수 없습니다 — 주소가 잘못됐거나 아직 이관되지 않은 활동일 수 있습니다";
    case ACADEMIC_SESSION_ERROR.CURRICULUM_ITEM_NOT_FOUND:
      return "커리큘럼 항목을 찾을 수 없습니다 — 이 활동의 회차가 아닐 수 있습니다";
    case ACADEMIC_SESSION_ERROR.SESSION_NOT_FOUND:
      return "회차 기록을 찾을 수 없습니다 — 이미 삭제됐거나 다른 활동의 회차일 수 있습니다";
    case ACADEMIC_SESSION_ERROR.FORBIDDEN:
      return "이 활동의 회차를 기록할 권한이 없습니다 — 활동의 스터디장만 회차를 기록할 수 있습니다";
    case API_ERROR.CONFIG_MISSING:
      return "서버 주소가 설정되지 않아 회차 정보를 불러올 수 없습니다";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/**
 * 제출·재제출 실패 → 한 줄.
 *
 * 사진 업로드는 회차 기록 저장이 끝난 **뒤에** 이어진다(`use-submit-session.ts`) — 그래서
 * 사진 구간에서 실패한 코드는 "기록은 저장됐다"를 함께 알린다. 이 함수는 코드만 옮기고,
 * "기록은 저장됨" 문구는 훅이 상황을 알고 붙인다.
 */
export function submitSessionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "회차 기록을 제출하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case ACADEMIC_SESSION_ERROR.SESSION_ALREADY_EXISTS:
      return "이미 기록된 회차입니다 — 화면을 새로고침하면 재제출 화면으로 열립니다";
    case ACADEMIC_SESSION_ERROR.SESSION_NOT_EDITABLE:
      return "지금은 회차 기록을 수정할 수 없습니다 — 국장 검토 중이거나 이미 승인된 회차입니다";
    case ACADEMIC_SESSION_ERROR.INVALID_ATTENDANCE_TARGET:
      return "출석 대상이 아닌 팀원이 포함돼 있습니다 — 화면을 새로고침해 팀원 명단을 다시 불러주세요";
    case ACADEMIC_SESSION_ERROR.VALIDATION_FAILED:
      return "입력값이 서버 기준과 맞지 않습니다 — 실제 진행일과 진행 내용을 확인해주세요";
    case ACADEMIC_SESSION_ERROR.FORBIDDEN:
      return "이 활동의 회차를 기록할 권한이 없습니다 — 활동의 스터디장만 회차를 기록할 수 있습니다";
    case ACADEMIC_SESSION_ERROR.CURRICULUM_ITEM_NOT_FOUND:
      return "커리큘럼 항목을 찾을 수 없습니다 — 화면을 새로고침해주세요";
    case ACADEMIC_SESSION_ERROR.SESSION_NOT_FOUND:
      return "회차 기록을 찾을 수 없습니다 — 화면을 새로고침해주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "서버 주소가 설정되지 않아 제출할 수 없습니다";
    case AUTH_ERROR.UNAUTHENTICATED:
    case AUTH_ERROR.UNAUTHORIZED:
      return "로그인이 만료됐습니다 — 다시 로그인한 뒤 제출해주세요";
    default:
      return error.message;
  }
}

/** 사진 업로드 구간의 실패 → 한 줄 (회차 기록은 이미 저장된 상태다) */
export function sessionPhotoErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "회차 기록은 저장됐지만 인증사진을 올리지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case SESSION_PHOTO_ERROR.UNSUPPORTED_IMAGE_TYPE:
      return "회차 기록은 저장됐습니다 — 인증사진 형식이 지원되지 않습니다. JPG·PNG 파일로 다시 올려주세요";
    case SESSION_PHOTO_ERROR.SESSION_NOT_EDITABLE:
      return "회차 기록은 저장됐지만 이미 승인된 회차라 인증사진은 바꿀 수 없습니다";
    case SESSION_PHOTO_ERROR.PUT_FAILED:
      return "회차 기록은 저장됐지만 사진 저장소에 올리지 못했습니다. 잠시 후 다시 시도해주세요";
    case API_ERROR.NETWORK_ERROR:
      return "회차 기록은 저장됐지만 서버에 연결할 수 없어 인증사진을 올리지 못했습니다";
    default:
      return "회차 기록은 저장됐지만 인증사진을 올리지 못했습니다 — " + error.message;
  }
}
