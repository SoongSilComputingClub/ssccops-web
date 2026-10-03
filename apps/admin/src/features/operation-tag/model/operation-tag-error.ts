import { OPERATION_TAG_ERROR } from "@/entities/operation-tag";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/*
 * 운영 태그 실패 → 화면에 띄울 한 줄 (#757 · #771 · 서버 #640).
 *
 * 관리(만들기·이름 바꾸기·지우기)와 지정(전체 교체)을 가른다 — 403의 문장과 404의 대상이 다르다.
 * 지정 교체의 404는 둘이다: 운영 건(업무·하위 업무·회의)이 없으면 `NOT_FOUND`, 고른 태그가 그 사이
 * 지워졌으면 `OPERATION_TAG_NOT_FOUND`(서버가 코드를 나눈 이유가 이 갈림이다).
 */

function commonMessage(error: ApiError): string {
  switch (error.code) {
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/** 태그 목록 조회·관리 실패 */
export function toOperationTagErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "태그를 처리하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "태그를 바꿀 권한이 없습니다 — 업무 관리(WORK_MANAGE) 권한이 필요합니다";
    // 클라이언트 선검사와 같은 문구 — 어디서 걸렸든 사용자에게는 같은 말이어야 한다
    case OPERATION_TAG_ERROR.OPERATION_TAG_NAME_DUPLICATED:
      return "이미 있는 태그입니다";
    case OPERATION_TAG_ERROR.OPERATION_TAG_NOT_FOUND:
      return "태그가 없습니다 — 목록을 새로고침해주세요";
    default:
      return commonMessage(error);
  }
}

/** 태그 목록 조회 실패 — 조회는 WORK_READ라 403 문장이 다르다 */
export function toOperationTagListErrorMessage(error: unknown): string {
  if (
    error instanceof ApiError &&
    (error.code === API_ERROR.FORBIDDEN || error.code === API_ERROR.ACCESS_DENIED)
  ) {
    return "태그를 볼 권한이 없습니다 — 업무 조회(WORK_READ) 권한이 필요합니다";
  }
  return toOperationTagErrorMessage(error);
}

/** 태그를 다는 대상의 화면 이름 — 404 문구에 쓴다 */
export type OperationTagSubject = "업무" | "하위 업무" | "회의";

/**
 * 운영 건의 태그 지정(전체 교체) 실패. `subject`는 화면의 대상 이름(«업무»·«하위 업무»·«회의») —
 * 서버는 셋을 같은 `NOT_FOUND`로 답하지만 사용자에게는 지금 보고 있는 것의 이름으로 말한다.
 */
export function toOperationTagAssignErrorMessage(
  error: unknown,
  subject: OperationTagSubject,
): string {
  if (!(error instanceof ApiError)) {
    return "태그를 저장하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "태그를 지정할 권한이 없습니다 — 업무 관리(WORK_MANAGE) 권한이 필요합니다";
    case OPERATION_TAG_ERROR.OPERATION_TAG_NOT_FOUND:
      return "지워진 태그가 있습니다 — 새로고침해주세요";
    case OPERATION_TAG_ERROR.OPERATION_NOT_FOUND:
      // 대상 이름 셋(업무·하위 업무·회의)이 모두 받침이 없어 «가»로 붙인다
      return `${subject}가 없습니다 — 목록을 새로고침해주세요`;
    default:
      return commonMessage(error);
  }
}

