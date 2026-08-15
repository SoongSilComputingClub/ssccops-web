import { ROUTES } from "@/shared/config/routes";
import { currentPath, withNextParam } from "@/shared/lib/next-path";
import { createClient } from "@/shared/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/** ssccops-server 공통 응답 봉투 (global.apipayload.ApiResponse) — 성공·실패 모두 이 모양이다 */
export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
  /** 커서 목록 응답에만 실린다 (AP-11). 단건·오류 응답에서는 아예 빠져 있다 */
  page?: PageEnvelope | null;
}

/**
 * 커서 페이징 봉투 (global.apipayload.PageResponse).
 *
 * 페이지 번호가 없는 것은 서버가 offset이 아니라 커서로 자르기 때문이다 — 다음 페이지는
 * `nextCursor`를 그대로 되돌려 주는 방식이고, 마지막 페이지면 `hasNext`가 false다.
 * `totalCount`는 필터를 적용한 건수, `overallCount`는 필터 이전 전체 건수다.
 */
export interface PageEnvelope {
  size: number;
  /** 서버가 실제로 적용한 정렬 — 다음 페이지 요청에 그대로 되돌려주면 정렬이 흔들리지 않는다 */
  sort: string;
  nextCursor: string | null;
  hasNext: boolean;
  totalCount: number;
  overallCount: number;
}

/** 목록 조회 결과 — 배열과 페이지 봉투를 함께 돌려준다 */
export interface ApiListResult<T> {
  data: T[];
  /** 서버가 page를 싣지 않았으면 null (목록이 아닌 응답을 목록으로 읽은 경우) */
  page: PageEnvelope | null;
}

/*
 * 프론트가 분기에 쓰는 오류 코드만 모아 둔다. 나머지 코드는 화면별 메시지 매핑에서
 * 문자열 그대로 다루므로 여기 나열하지 않는다.
 *
 * CLIENT_* 는 서버가 준 코드가 아니라 요청이 서버에 닿지도 못한 상황을 같은 방식으로
 * 다루려고 클라이언트가 붙이는 코드다 — 호출부가 try/catch 한 곳에서 처리하게 하기 위함.
 */
export const API_ERROR = {
  /** 토큰이 없거나 무효 — 재로그인이 필요하다 */
  UNAUTHORIZED: "COMMON401",
  /** 인증은 됐지만 아직 가입하지 않았다 — 재로그인이 아니라 가입 화면으로 보내야 한다 */
  SIGNUP_REQUIRED: "SIGNUP_REQUIRED",
  /**
   * 가입은 했지만 이 동작을 할 권한이 없다 (403 · ssccops-server #9).
   *
   * 서버가 같은 문자열을 두 자리에서 쓴다 — 권한 코드 부족(MemberErrorCode.AUTHORITY_REQUIRED)과
   * 승인자 아님(OperationErrorCode.FORBIDDEN)이다. 화면이 보기에는 둘 다 "권한이 없어 거절됐다"라
   * 같은 코드로 온다.
   */
  FORBIDDEN: "FORBIDDEN",
  /**
   * 시큐리티 필터체인이 핸들러 이전에 끊은 403 (CommonErrorCode.FORBIDDEN).
   *
   * 위 FORBIDDEN과 뜻은 같지만 코드 문자열이 다르다 — 애스펙트까지 오지 못한 요청이라 서버가
   * 공통 코드를 쓴다. 둘을 따로 두는 것은 어느 관문에서 걸렸는지가 로그에서 갈리기 때문이고,
   * 화면 처리는 같다.
   */
  ACCESS_DENIED: "COMMON403",
  /** NEXT_PUBLIC_API_BASE_URL 미설정 */
  CONFIG_MISSING: "CLIENT_CONFIG_MISSING",
  /** 백엔드가 꺼져 있거나 CORS·네트워크 문제로 응답 자체를 받지 못함 */
  NETWORK_ERROR: "CLIENT_NETWORK_ERROR",
} as const;

/** 서버 오류 코드를 그대로 실어 나르는 오류 — 호출부는 message가 아니라 code로 분기한다 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/** 세션이 끊겼을 때 원래 가려던 경로를 살려 로그인으로 보낸다 */
function redirectToLogin() {
  const next = currentPath();
  if (next === null) return;
  window.location.replace(withNextParam(ROUTES.login, next, ROUTES.dashboard));
}

/**
 * 가입이 필요한 응답(403 SIGNUP_REQUIRED)을 가입 화면으로 보낸다.
 *
 * 여기서도 원래 경로를 `?next=` 로 실어 보낸다. 공개 폼(/f/{formId})을 열었다가 이 분기를
 * 타는 경우가 있는데, next 없이 보내면 가입을 마친 사람이 대시보드에 떨어져 자기가 어떤
 * 폼에 참여하려 했는지 스스로 다시 찾아가야 한다.
 */
function redirectToSignup() {
  const next = currentPath();
  if (next === null) return;
  if (window.location.pathname === ROUTES.signup) return;
  window.location.replace(withNextParam(ROUTES.signup, next, ROUTES.dashboard));
}

/** 오류 응답도 본문이 비어 있을 수 있다 (프록시가 끊은 502 등) — 파싱 실패를 오류로 키우지 않는다 */
async function readEnvelope<T>(response: Response): Promise<ApiResponse<T> | null> {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return null;
  }
}

/**
 * ssccops-server 호출. Supabase access token을 실어 보내고 성공한 ApiResponse 봉투를 돌려준다.
 *
 * 실패는 모두 {@link ApiError}로 통일한다 — 호출부가 HTTP 상태와 응답 스키마를 다시 해석하지
 * 않게 하려는 것이다. 401(갱신 후 재로그인)과 403 SIGNUP_REQUIRED(가입 화면)처럼 화면 전환이
 * 정해져 있는 두 경우는 여기서 리다이렉트까지 끝내고, 호출부에는 오류만 던진다.
 *
 * 봉투째 돌려주는 것은 목록 응답의 `page`가 `data` 옆에 오기 때문이다 — 호출부는 대개
 * {@link apiFetch}(data만)나 {@link apiFetchList}(data + page)를 쓴다.
 */
async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  if (!API_BASE_URL) {
    /*
     * 예전에는 값이 없으면 `undefined/v1/...`로 요청이 나가 404·CORS 오류로 둔갑했다.
     * 설정 누락은 런타임 오류가 아니라 배포 실수이므로 원인을 그대로 드러낸다.
     */
    throw new ApiError(
      API_ERROR.CONFIG_MISSING,
      "NEXT_PUBLIC_API_BASE_URL이 설정되지 않아 서버를 호출할 수 없습니다",
    );
  }

  const supabase = createClient();

  const send = async (token: string | undefined): Promise<Response> => {
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init?.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    try {
      return await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
    } catch {
      throw new ApiError(API_ERROR.NETWORK_ERROR, "서버에 연결할 수 없습니다");
    }
  };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  let response = await send(session?.access_token);

  /*
   * 401은 access token 만료가 대부분이라 refresh 후 딱 한 번만 재시도한다.
   * 그래도 401이면 refresh token까지 죽은 것이므로 남은 쿠키를 정리하고 재로그인으로 보낸다 —
   * 안 그러면 화면마다 401이 반복되며 오류만 쌓인다.
   */
  if (response.status === 401) {
    const { data } = await supabase.auth.refreshSession();
    if (data.session?.access_token) {
      response = await send(data.session.access_token);
    }
    if (response.status === 401) {
      await supabase.auth.signOut();
      redirectToLogin();
      throw new ApiError(
        API_ERROR.UNAUTHORIZED,
        "세션이 만료되었습니다. 다시 로그인해주세요",
        401,
      );
    }
  }

  const envelope = await readEnvelope<T>(response);

  if (!response.ok || envelope?.success !== true) {
    const code = envelope?.code ?? `HTTP_${response.status}`;
    if (response.status === 403 && code === API_ERROR.SIGNUP_REQUIRED) {
      redirectToSignup();
    }
    throw new ApiError(
      code,
      envelope?.message ?? `요청이 실패했습니다 (HTTP ${response.status})`,
      response.status,
    );
  }

  return envelope;
}

/** 단건 호출 — 봉투를 벗겨 data만 돌려준다 */
export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const envelope = await request<T>(path, init);
  return envelope.data as T;
}

/**
 * 커서 목록 호출 — data 배열과 page 봉투를 함께 돌려준다.
 *
 * `apiFetch`로 목록을 받으면 `page`가 버려져 다음 페이지가 있는지조차 알 수 없다. 커서
 * 페이징 목록(운영 도메인의 업무·하위 업무·승인함)은 첫 페이지만 보여 주고 조용히 끊기는
 * 대신 이 함수를 써서 `hasNext`·`nextCursor`를 화면까지 올린다.
 *
 * `data`가 null이면 빈 배열로 떨어뜨린다 — 목록이 비었다는 것과 응답이 없다는 것을 화면이
 * 다르게 다룰 이유가 없다.
 */
export async function apiFetchList<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiListResult<T>> {
  const envelope = await request<T[]>(path, init);
  return { data: envelope.data ?? [], page: envelope.page ?? null };
}
