// 서버 전용 조회를 품은 배럴이 아니라 순수 상수 모듈에서 직접 가져온다 — 이 파일은 브라우저 훅도 부른다
import {
  EVENT_POST_ERROR,
  EVENT_POST_IMAGE_ERROR,
} from "@/entities/academic-program/api/error-codes";
import { AUTH_ERROR } from "@/shared/api/auth-error";
import { API_ERROR, ApiError } from "@/shared/api/client";

/*
 * 소개 글 조회·저장·이미지 실패 → 한 줄 (#819 · ADR-0069 · 서버 #699).
 *
 * 화면은 `ApiError.code`로만 분기하고 모르는 코드는 서버 문장을 그대로 보인다. 조회와 저장을
 * 나눈 것은 지원서 문항(`recruitment-form-error.ts`)과 같은 이유다 — 403이 조회에서는 «볼 수 없다»,
 * 저장에서는 «고칠 수 없다»다.
 *
 * 409 잠금은 화면이 `isEditable`로 이미 잠근 뒤라 **열어 둔 사이 접수가 끝났거나 수료·폐지된**
 * 경우다. 이유는 서버가 다시 조회에서 주므로 문구는 새로고침만 권한다(화면이 이유를 짐작하지 않는다).
 */

const LOCKED = "소개 글을 고칠 수 없는 상태가 됐습니다 — 새로고침해주세요";

/** 조회 실패 — 화면을 못 그린다 */
export function toEventPostErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "소개 글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }
  switch (error.code) {
    case EVENT_POST_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "프로그램이 없습니다 — 내 프로그램 목록을 새로고침해주세요";
    case EVENT_POST_ERROR.FORBIDDEN:
      return "내가 맡은 프로그램의 소개 글만 볼 수 있습니다";
    case AUTH_ERROR.SIGNUP_REQUIRED:
      return "회원만 볼 수 있는 화면입니다";
    case API_ERROR.CONFIG_MISSING:
      return "지금은 소개 글을 불러올 수 없습니다 — 잠시 후 다시 시도해주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/** 저장 실패 — 화면은 떠 있고 고치던 중이다 */
export function toEventPostSaveErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "저장하지 못했습니다. 잠시 후 다시 시도해주세요";
  }
  switch (error.code) {
    case EVENT_POST_ERROR.ACADEMIC_PROGRAM_EVENT_POST_LOCKED:
      return LOCKED;
    case EVENT_POST_ERROR.EVENT_CONTENT_TOO_LARGE:
      return "본문이 100,000자를 넘어 저장할 수 없습니다 — 내용을 줄여주세요";
    case EVENT_POST_ERROR.FORBIDDEN:
      return "내가 맡은 프로그램의 소개 글만 고칠 수 있습니다";
    case EVENT_POST_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "프로그램이 없습니다 — 내 프로그램 목록을 새로고침해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "지금은 저장할 수 없습니다 — 잠시 후 다시 시도해주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/**
 * 이미지 올리기 실패 — 발급·R2 PUT 두 구간. 허용 형식·용량 숫자를 문구에 적지 않는다(서버가 쥔다).
 * 문장은 어드민 행사 이미지(`toEventImageUploadErrorMessage`)와 같다.
 */
export function toEventPostImageErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "이미지를 올리지 못했습니다. 잠시 후 다시 시도해주세요";
  }
  switch (error.code) {
    case EVENT_POST_IMAGE_ERROR.UNSUPPORTED_IMAGE_TYPE:
      return "올릴 수 없는 형식의 파일입니다 — 확장자가 붙은 이미지 파일로 다시 골라주세요";
    case EVENT_POST_IMAGE_ERROR.IMAGE_TOO_LARGE:
      return "이미지 용량이 허용 범위를 넘습니다 — 크기를 줄여 다시 올려주세요";
    case EVENT_POST_IMAGE_ERROR.PUT_FAILED:
      return "이미지를 올리지 못했습니다 — 잠시 후 다시 시도해주세요";
    default:
      return toEventPostSaveErrorMessage(error);
  }
}
