/*
 * 앱이 꽂아 주는 전송 계층과의 계약 (ssccops-web#664).
 *
 * 이 패키지는 **서버 계약(경로·요청 본문·오류 코드)은 알고 전송 계층은 모른다.** 토큰을 어디서
 * 꺼내는지, 401을 리다이렉트로 끝내는지는 앱마다 다르고(루트 `AGENTS.md` «인증 — 세 앱이 같은
 * 것과 다른 것»), 그 차이가 여기로 올라오면 패키지가 앱 이름을 알게 된다. 그래서 받는 것은
 * «봉투를 벗겨 `data`만 돌려주는 인증 호출» 함수 하나뿐이다 — www·lms 모두
 * `shared/api/browser-client.ts`의 `apiFetchAuthedFromBrowser`를 넘긴다.
 */

/** 앱이 주입하는 인증 API 호출 — 실패는 아래 {@link ApiFailure} 모양으로 던진다 */
export type AuthedApiFetch = <T>(path: string, init?: RequestInit) => Promise<T>;

/** 주입한 통로가 던지는 실패 — 앱의 `ApiError`가 이 모양이다(`code` + `status`) */
export interface ApiFailure {
  code: string;
  status: number;
  message: string;
}

/**
 * 실패를 {@link ApiFailure}로 읽는다 — **`instanceof`로 판정하지 않는다.**
 *
 * `ApiError` 클래스는 앱마다 따로 있다(`apps/{www,lms}/src/shared/api/client.ts` — 글자까지 같은
 * 두 벌이다). 패키지가 어느 한쪽을 임포트하면 그 앱을 알게 되고, 다른 앱에서는 `instanceof`가
 * 늘 거짓이라 모든 실패가 «잠시 후 다시 시도해주세요» 한 줄로 뭉개진다 — 학번 중복(연결 갈림길)
 * 도, 429 잠금도 그 한 줄이 된다. 두 클래스 모두 `name`을 `"ApiError"`로 박고 `code`·`status`를
 * 들고 있으므로 그 모양으로 판정한다.
 */
export function toApiFailure(error: unknown): ApiFailure | null {
  if (!(error instanceof Error) || error.name !== "ApiError") return null;
  const { code, status } = error as Error & { code?: unknown; status?: unknown };
  if (typeof code !== "string" || typeof status !== "number") return null;
  return { code, status, message: error.message };
}

/**
 * 앱 클라이언트가 **서버에 닿기 전에 스스로 세우는** 코드.
 *
 * 정의는 앱에 있고(`shared/api/client.ts`의 `API_ERROR` · `shared/api/auth-error.ts`의
 * `AUTH_ERROR`) 여기 있는 것은 이 패키지가 분기에 쓰는 값이다. 주입하는 통로를 바꾸는 사람은
 * 이 네 값이 같은지 함께 본다 — 갈리면 타입은 통과하고 문구만 «알 수 없는 오류»로 떨어진다.
 */
export const CLIENT_ERROR = {
  /** NEXT_PUBLIC_API_BASE_URL 미설정 */
  CONFIG_MISSING: "CLIENT_CONFIG_MISSING",
  /** 서버가 꺼져 있거나 네트워크 문제로 응답 자체를 받지 못함 */
  NETWORK_ERROR: "CLIENT_NETWORK_ERROR",
  /** 쿠키에 세션 자체가 없다 — 서버에 요청을 보내지도 않은 상태 */
  UNAUTHENTICATED: "CLIENT_UNAUTHENTICATED",
  /** 토큰이 무효하거나 만료됐다 */
  UNAUTHORIZED: "COMMON401",
} as const;
