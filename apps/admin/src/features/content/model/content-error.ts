import { CONTENT_ERROR, CONTENT_IMAGE_PUT_FAILED } from "@/entities/content";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/*
 * 콘텐츠 API 실패 → 화면에 띄울 한 줄 (#521).
 *
 * 401·403 SIGNUP_REQUIRED는 apiFetch가 리다이렉트까지 끝내므로 다루지 않는다. 남은 403은 권한
 * 부족 — 무엇이 필요한지 이름으로 밝힌다(루트 AGENTS «화면 문구» 권한 오류 표준). 알 수 없는
 * 코드는 서버 메시지를 그대로 보여 준다.
 */

/** 권한 없음 표준 문구 — 화면의 잠긴 버튼 `title`과 오류 매핑이 같은 이름을 부른다 */
export const NO_CONTENT_MANAGE =
  "콘텐츠를 다룰 권한이 없습니다 — 콘텐츠 관리(CONTENT_MANAGE) 권한이 필요합니다";

/** 조회·공통 실패. 다른 매핑이 마지막에 이리로 떨어진다 */
export function toContentErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "콘텐츠를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return NO_CONTENT_MANAGE;
    case CONTENT_ERROR.PAGE_NOT_FOUND:
      return "페이지가 없습니다 — 목록을 새로고침해주세요";
    case CONTENT_ERROR.POST_NOT_FOUND:
      return "포스트가 없습니다 — 목록을 새로고침해주세요";
    default:
      return error.message;
  }
}

/** 저장(생성·수정) 실패 — 페이지·포스트 공통 */
export function toContentSaveErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "저장하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case CONTENT_ERROR.CONTENT_SLUG_DUPLICATED:
      return "이미 쓰고 있는 주소(slug)입니다 — 다른 값으로 바꿔주세요";
    case CONTENT_ERROR.COVER_NOT_IN_GALLERY:
      return "표지는 갤러리에 있는 이미지만 됩니다 — 갤러리에서 다시 골라주세요";
    case CONTENT_ERROR.CONTENT_TOO_LARGE:
      return "본문이 100,000자를 넘어 저장할 수 없습니다 — 내용을 줄여주세요";
    case CONTENT_ERROR.VALIDATION_FAILED:
      return "입력값이 올바르지 않습니다 — 주소(slug)·제목·요약 길이를 확인해주세요";
    case CONTENT_ERROR.EVENT_NOT_FOUND:
      return "연결한 행사가 없습니다 — 다른 행사를 골라주세요";
    default:
      return toContentErrorMessage(error);
  }
}

/**
 * 게시·게시 취소 실패. 같은 상태로의 재전이(409)는 화면이 낡았다는 뜻이라 사과하지 않고 다시
 * 불러온다고만 알린다.
 */
export function toContentPublishErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "게시 상태를 바꾸지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case CONTENT_ERROR.CONTENT_ALREADY_PUBLISHED:
      return "이미 게시된 글입니다 — 다시 불러왔습니다";
    case CONTENT_ERROR.CONTENT_NOT_PUBLISHED:
      return "게시되지 않은 글입니다 — 다시 불러왔습니다";
    default:
      return toContentErrorMessage(error);
  }
}

/**
 * 갤러리 이미지 올리기 실패 (발급 · R2 PUT 두 구간).
 *
 * 허용 형식과 상한을 숫자로 적지 않는다 — 값은 서버에만 있다(행사 이미지와 같은 판단).
 */
export function toContentImageErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "이미지를 올리지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case CONTENT_ERROR.UNSUPPORTED_IMAGE_TYPE:
      return "올릴 수 없는 형식의 파일입니다 — 확장자가 붙은 이미지 파일로 다시 골라주세요";
    case CONTENT_ERROR.IMAGE_TOO_LARGE:
      return "이미지 용량이 허용 범위를 넘습니다 — 크기를 줄여 다시 올려주세요";
    case CONTENT_IMAGE_PUT_FAILED:
      return "이미지를 올리지 못했습니다 — 잠시 후 다시 시도해주세요";
    case CONTENT_ERROR.CONTENT_IMAGE_NOT_FOUND:
      return "이미지가 없습니다 — 새로고침해주세요";
    default:
      return toContentErrorMessage(error);
  }
}

/** 행사에서 포스트 만들기 실패 */
export function toPostFromEventErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "포스트를 만들지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  if (error.code === CONTENT_ERROR.EVENT_NOT_FOUND) {
    return "행사가 없습니다 — 목록을 새로고침해주세요";
  }
  return toContentErrorMessage(error);
}
