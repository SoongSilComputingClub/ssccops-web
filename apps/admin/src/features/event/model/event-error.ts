import {
  EVENT_CATEGORY_ERROR,
  EVENT_ERROR,
  EVENT_IMAGE_ERROR,
  EVENT_PARTICIPANT_ERROR,
} from "@/entities/event";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/*
 * 행사 API 실패 → 화면에 띄울 한 줄 (#136).
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서는 다루지 않는다. 남은 403은 권한 부족이다 — 무엇이 필요한지 이름으로 밝힌다(#117).
 * 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 뭉개면 서버가 내려보낸 원인이 사라진다.
 */

/** 조회·공통 실패. 행사 화면의 다른 매핑이 마지막에 이리로 떨어진다 */
export function toEventErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "행사 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "행사를 다룰 권한이 없습니다 — 행사 관리(EVENT_MANAGE) 권한이 필요합니다";
    case EVENT_ERROR.EVENT_NOT_FOUND:
      return "행사를 찾을 수 없습니다 — 이미 삭제된 행사일 수 있습니다";
    default:
      return error.message;
  }
}

/**
 * 저장(생성·수정) 실패.
 *
 * 폼 연결의 두 409는 서버만 아는 사실이다 — 화면이 들고 있는 폼 목록으로는 다른 행사에 이미
 * 전속됐는지(D11), 신청이 방금 생겼는지 알 수 없다. 문구에 다음 행동을 담는다.
 */
export function toEventSaveErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "행사를 저장하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case EVENT_ERROR.EVENT_FORM_IN_USE:
      return "신청이 접수된 행사라 폼 연결을 바꾸거나 해제할 수 없습니다 — 폼은 그대로 두고 저장해주세요";
    case EVENT_ERROR.FORM_ALREADY_LINKED:
      return "이미 다른 행사에 연결된 폼입니다 — 다른 폼을 고르거나 그쪽 연결을 먼저 해제해주세요";
    case EVENT_ERROR.EVENT_CLASSIFICATION_NOT_FOUND:
      return "없는 행사 분류입니다 — 분류가 방금 삭제됐을 수 있으니 다시 골라주세요";
    case EVENT_ERROR.EVENT_CONTENT_TOO_LARGE:
      return "본문이 100,000자를 넘어 저장할 수 없습니다 — 내용을 줄여주세요";
    default:
      return toEventErrorMessage(error);
  }
}

/**
 * 이미지 업로드 실패 (ssccops#141 — 발급 · R2 PUT 두 구간).
 *
 * **허용 형식과 용량 상한을 문구에 숫자로 적지 않는다.** 그 값은 서버에만 있어서(웹은
 * 사전 검증을 하지 않는다) 여기 적으면 서버가 상한을 바꾼 날 화면만 옛 숫자를 말한다 —
 * 사용자는 화면 말을 믿고 줄였는데도 계속 막히게 된다. 대신 다음 행동을 담는다.
 *
 * R2 구간의 실패(PUT_FAILED)는 우리 서버가 준 코드가 아니다 — 발급까지는 됐고 바이트만
 * 넘어가지 못한 것이라, 재시도가 곧 다음 행동이다(허가증은 다시 발급받는다).
 */
export function toEventImageUploadErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "이미지를 올리지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case EVENT_IMAGE_ERROR.UNSUPPORTED_IMAGE_TYPE:
      return "올릴 수 없는 형식의 파일입니다 — 이미지 파일을 골라주세요";
    case EVENT_IMAGE_ERROR.IMAGE_TOO_LARGE:
      return "이미지 용량이 허용 범위를 넘습니다 — 크기를 줄여 다시 올려주세요";
    case EVENT_IMAGE_ERROR.PUT_FAILED:
      return "이미지를 저장소에 올리지 못했습니다 — 잠시 후 다시 시도해주세요";
    default:
      return toEventErrorMessage(error);
  }
}

/** 상태 전이(게시·게시 철회·보관·재공개) 실패 */
export function toEventStatusErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "행사 상태를 바꾸지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    /* 전이표 밖 — 원인이 사용자가 아니라 화면이 낡은 것이다. 다시 불러온다고 알린다 */
    case EVENT_ERROR.INVALID_EVENT_STATUS_TRANSITION:
      return "이미 상태가 바뀐 행사입니다. 최신 상태를 다시 불러옵니다";
    default:
      return toEventErrorMessage(error);
  }
}

/** 삭제 실패 */
export function toEventDeleteErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "행사를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  if (error.code === EVENT_ERROR.EVENT_HAS_PARTICIPANT) {
    return "참가자가 있는 행사는 삭제할 수 없습니다 — 삭제 대신 보관으로 전환해주세요";
  }
  return toEventErrorMessage(error);
}

/**
 * 신청(연결 폼의 응답) 목록 조회 실패 (#145 · GET /v1/events/{eventId}/applications).
 *
 * 폼 미연결(409)은 고장이 아니라 **행사의 상태**다 — 재시도 버튼을 주는 대신 다음 행동
 * (폼을 만들어 연결한다)을 문구에 담고, 화면은 이 경우를 오류가 아닌 안내로 그린다.
 */
export function toEventApplicationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "신청 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  if (error.code === EVENT_PARTICIPANT_ERROR.EVENT_HAS_NO_FORM) {
    return "연결된 폼이 없습니다 — 신청을 받으려면 행사 수정에서 신청 폼을 먼저 연결해주세요";
  }
  return toEventErrorMessage(error);
}

/** 참가자 명단 조회 실패 */
export function toEventParticipantErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "참가자 명단을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }
  return toEventErrorMessage(error);
}

/**
 * 참가자 등록 실패.
 *
 * **정원 초과는 여기 없다.** 초과해도 등록은 성공하고(D5 — 정원은 참고치다) 성공 응답의
 * `overCapacity`로 오므로, 실패 문구에 정원 이야기를 적으면 막힌 적 없는 일을 막혔다고
 * 알리는 셈이 된다.
 *
 * ACCEPTED가 아닌 응답으로 올렸을 때의 코드는 서버가 아직 이름을 정하지 않았다
 * (ssccops-server#158의 「응답 기반 등록 거절 코드」). 그래서 여기서 코드로 분기하지 않고
 * default로 떨어뜨려 서버 문장을 그대로 보여 준다 — 짐작한 코드를 적어 두면 이름이 달랐을 때
 * 조용히 빗나가고, 화면은 그 사실조차 알 수 없다.
 */
export function toEventParticipantRegisterErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "참가자를 등록하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case EVENT_PARTICIPANT_ERROR.EVENT_PARTICIPANT_DUPLICATED:
      return "이미 이 행사의 명단에 있는 회원입니다 — 참가자 명단에서 상태를 확인해주세요";
    case EVENT_PARTICIPANT_ERROR.EVENT_HAS_NO_FORM:
      return "연결된 폼이 없어 신청으로 등록할 수 없습니다 — 회원을 직접 추가해주세요";
    default:
      return toEventErrorMessage(error);
  }
}

/** 참가자 상태 전이(대기 → 확정 승격 · 확정 → 취소) 실패 */
export function toEventParticipantStatusErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "참가자 상태를 바꾸지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    /* 전이표 밖 — 원인이 사용자가 아니라 화면이 낡은 것이다. 다시 불러온다고 알린다 */
    case EVENT_PARTICIPANT_ERROR.INVALID_PARTICIPANT_STATUS_TRANSITION:
      return "이미 상태가 바뀐 참가자입니다. 최신 명단을 다시 불러옵니다";
    case EVENT_PARTICIPANT_ERROR.EVENT_PARTICIPANT_NOT_FOUND:
      return "명단에 없는 참가자입니다. 최신 명단을 다시 불러옵니다";
    default:
      return toEventErrorMessage(error);
  }
}

/**
 * 분류 관리(추가·수정·삭제·조회) 실패.
 *
 * `VALIDATION_FAILED`류는 서버 문장을 그대로 쓴다(default) — 어느 칸이 왜 틀렸는지를 서버가
 * 이미 담아 보낸다(역할 분류와 같은 판단).
 */
export function toEventCategoryErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "행사 분류를 처리하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case EVENT_CATEGORY_ERROR.EVENT_CLASSIFICATION_IN_USE:
      return "이 분류를 쓰는 행사가 있어 삭제할 수 없습니다 — 행사의 분류를 먼저 바꿔주세요";
    case EVENT_CATEGORY_ERROR.EVENT_CLASSIFICATION_NOT_FOUND:
      return "이미 없는 분류입니다. 목록을 다시 불러옵니다";
    default:
      return toEventErrorMessage(error);
  }
}
