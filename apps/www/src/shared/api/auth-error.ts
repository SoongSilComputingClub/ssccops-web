import { ApiError } from "./client";

/*
 * 인증 관련 오류 코드와 판정 — **전송 계층과 나눠 둔다.**
 *
 * 옆의 `authed-client.ts`는 쿠키에서 토큰을 꺼내야 해서 `next/headers`에 의존하는 서버 전용
 * 모듈이다. 신청 흐름의 폼 작성 화면은 브라우저에서 같은 코드로 분기해야 하는데(자동 저장·제출이
 * 클라이언트에서 일어난다), 거기서 `authed-client`를 임포트하면 서버 전용 모듈이 클라이언트
 * 번들로 끌려 들어와 빌드가 깨진다. 그래서 **코드값과 판정만** 이 파일에 두고 서버·브라우저
 * 클라이언트가 함께 임포트한다.
 *
 * `authed-client.ts`는 이 파일을 그대로 재export한다 — 기존 임포트 경로를 지키기 위한 것이고
 * 정의는 여기 한 곳뿐이다.
 */

/** 화면이 분기에 쓰는 인증 관련 코드 */
export const AUTH_ERROR = {
  /** 쿠키에 세션 자체가 없다 — 아직 로그인하지 않았다(서버에 요청을 보내지도 않은 상태) */
  UNAUTHENTICATED: "CLIENT_UNAUTHENTICATED",
  /** 토큰이 무효하거나 만료됐다 — 다시 로그인해야 한다 */
  UNAUTHORIZED: "COMMON401",
  /** 인증은 됐지만 아직 회원이 아니다 — 재로그인이 아니라 가입 안내다 */
  SIGNUP_REQUIRED: "SIGNUP_REQUIRED",
} as const;

/**
 * "다시 로그인해야 하는 실패"인가 — 아직 로그인하지 않은 경우와 토큰이 죽은 경우를 함께 본다.
 *
 * 화면이 두 경우에 하는 일이 같기 때문이다(로그인 버튼을 내준다). 상태 코드까지 함께 보는 것은
 * 서버 앞의 프록시가 봉투 없이 401로 끊는 경우가 있어서다.
 */
export function isUnauthenticated(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === AUTH_ERROR.UNAUTHENTICATED ||
      error.code === AUTH_ERROR.UNAUTHORIZED ||
      error.status === 401)
  );
}

/** 인증은 됐지만 아직 가입하지 않은 사용자인가 — 화면은 가입 안내를 그린다 */
export function isSignupRequired(error: unknown): boolean {
  return error instanceof ApiError && error.code === AUTH_ERROR.SIGNUP_REQUIRED;
}
