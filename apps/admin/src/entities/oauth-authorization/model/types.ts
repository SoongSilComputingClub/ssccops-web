/*
 * Supabase OAuth 2.1 서버의 인가 요청 (ssccops#315 · ADR-0026).
 *
 * 이 엔티티의 정본은 ssccops-server가 아니라 **Supabase Auth**다 — 인가 요청은 우리 서버를
 * 거치지 않고 Supabase가 들고 있으며, 웹은 supabase-js `auth.oauth` 네임스페이스로 읽고
 * 승인·거절한다. 그래서 `apiFetch` 봉투 규약이 아니라 SDK의 `{ data, error }` 모양을 받는다.
 *
 * SDK 응답(`OAuthAuthorizationDetails`)은 snake_case(`redirect_uri`·`client.logo_uri`)다. 화면이
 * 쓰는 값만 camelCase로 옮기고 나머지는 싣지 않는다 — 서버 DTO를 그대로 두는 규약은 우리
 * 서버 계약을 추적하기 위한 것이고, 여기서는 SDK 타입이 이미 그 역할을 한다.
 */

/** 동의 화면이 보여 줄 인가 요청 한 건 */
export interface OAuthAuthorization {
  /** 승인·거절에 되돌려 줄 식별자 — 주소의 `authorization_id`와 같다 */
  authorizationId: string;
  /**
   * 클라이언트 이름 — 동적 등록(DCR)이면 클라이언트가 스스로 적어 낸 값이다.
   *
   * 그래서 감추지 않는다(ADR-0026). DCR을 켠 뒤에는 아무나 클라이언트를 등록할 수 있어
   * 이 화면이 방어선이며, 사용자가 이름과 돌아갈 호스트를 보고 판단해야 한다.
   */
  clientName: string;
  /** 클라이언트가 등록한 웹사이트 — 없으면 null */
  clientUri: string | null;
  /**
   * 승인 뒤 돌아갈 곳의 **호스트**만. 전체 URI는 경로·쿼리가 길어 좁은 화면에서 읽히지 않고,
   * 사용자가 판단할 값은 "어느 앱으로 가는가"라 호스트로 충분하다. 파싱이 안 되는 값
   * (커스텀 스킴 등)은 원문 그대로 보인다.
   */
  redirectHost: string;
  /** 요청한 scope — 공백으로 구분된 문자열을 쪼갠 것. 빈 요청이면 빈 배열 */
  scopes: string[];
}

/**
 * 조회 결과 — 동의가 필요하거나(consent), 이미 동의한 적이 있어 곧바로 돌아가거나(redirect).
 *
 * 두 번째 경우 Supabase는 `redirect_url`만 돌려주고, 화면은 그리지 않고 그 주소로 보낸다.
 */
export type OAuthAuthorizationLookup =
  | { kind: "consent"; authorization: OAuthAuthorization }
  | { kind: "redirect"; redirectUrl: string };

/**
 * 조회·승인·거절이 실패한 이유 — 화면이 갈라 그리는 것은 이 셋뿐이다.
 *
 * - `session-missing` 브라우저에 Supabase 세션이 없다. 미들웨어가 걸러 주므로 드물지만,
 *   열어 둔 사이 로그아웃했을 때 온다 — 로그인으로 보낸다
 * - `invalid` 인가 요청이 없거나(잘못된 id) 만료됐거나 이미 처리됐다 — 다시 시작해야 한다
 * - `unknown` 네트워크·서버 오류 — 다시 시도할 수 있다
 */
export type OAuthAuthorizationFailure = "session-missing" | "invalid" | "unknown";

export class OAuthAuthorizationError extends Error {
  readonly reason: OAuthAuthorizationFailure;

  constructor(reason: OAuthAuthorizationFailure, message: string) {
    super(message);
    this.name = "OAuthAuthorizationError";
    this.reason = reason;
  }
}
