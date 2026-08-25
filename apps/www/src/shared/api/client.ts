/*
 * 공개 API 호출 유틸 (wave2 D1 — 비로그인 완전 공개).
 *
 * 어드민의 `shared/lib/api/client.ts`와 **일부러 나눠 두었다**. 저쪽은 Supabase 세션을 실어
 * 보내고 401·403 SIGNUP_REQUIRED를 리다이렉트까지 끝내는데, 공개 앱은 익명 호출이라 그 로직이
 * 통째로 필요 없다(붙여 두면 로그인 없는 앱에 로그인 화면으로 가는 길만 남는다). 커서 페이징
 * 봉투(`page`)도 공개 목록 계약에 없어 여기서는 다루지 않는다.
 *
 * 공유 패키지로 뽑는 것은 후속 이슈다 — 두 앱이 실제로 같은 것을 필요로 하는지 확인한 뒤에 한다.
 */

/*
 * 끝 슬래시를 떼어 둔다 — 호출부는 전부 "/public/v1/..."처럼 슬래시로 시작하는 경로를 넘기므로,
 * 환경변수 값에 끝 슬래시가 붙어 있으면 모든 요청이 `https://...//public/v1/...`로 나간다
 * (어드민 배포 dev가 실제로 그 상태였다).
 *
 * 값이 비어 있으면 빈 문자열이 아니라 undefined로 둔다 — 미설정을 아래에서 CLIENT_CONFIG_MISSING
 * 으로 갈라내야 하는데, 빈 문자열로 뭉개면 그 분기가 사라진다.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || undefined;

/** ssccops-server 공통 응답 봉투 (global.apipayload.ApiResponse) — 성공·실패 모두 이 모양이다 */
interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
}

/**
 * 요청이 서버에 닿지도 못한 상황에 클라이언트가 붙이는 코드.
 *
 * 서버가 준 코드가 아니라는 것을 이름으로 드러낸다 — 호출부는 서버 오류 코드와 이것들을
 * 한 자리에서 `ApiError.code`로 함께 다룬다.
 */
export const API_ERROR = {
  /** NEXT_PUBLIC_API_BASE_URL 미설정 */
  CONFIG_MISSING: "CLIENT_CONFIG_MISSING",
  /** 서버가 꺼져 있거나 네트워크 문제로 응답 자체를 받지 못함 */
  NETWORK_ERROR: "CLIENT_NETWORK_ERROR",
  /** 봉투가 아닌 응답(프록시가 끊은 502 등) — 상태 코드만 알고 코드는 모르는 실패 */
  UNKNOWN: "CLIENT_UNKNOWN_ERROR",
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

/** 오류 응답도 본문이 비어 있을 수 있다 — 파싱 실패를 오류로 키우지 않는다 */
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
 * 공개 API 호출 — 봉투를 벗겨 `data`만 돌려주고, 실패는 전부 {@link ApiError}로 통일한다.
 *
 * **캐시하지 않는다.** Next 16의 `fetch`는 기본이 no-store지만 여기서 명시해 둔다 — 게시 철회한
 * 행사가 캐시에 남아 계속 보이는 것이 이 앱에서 가장 곤란한 종류의 어긋남이고, 그 판단을
 * 프레임워크 기본값에 맡기고 싶지 않기 때문이다.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    /*
     * 값이 없으면 `undefined/public/v1/...`로 요청이 나가 404로 둔갑한다. 설정 누락은 런타임
     * 오류가 아니라 배포 실수이므로 원인을 그대로 드러낸다.
     */
    throw new ApiError(
      API_ERROR.CONFIG_MISSING,
      "서버 주소가 설정되지 않아 행사 정보를 불러올 수 없습니다",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store", ...init });
  } catch {
    throw new ApiError(API_ERROR.NETWORK_ERROR, "서버에 연결할 수 없습니다");
  }

  const envelope = await readEnvelope<T>(response);

  if (!response.ok || !envelope?.success) {
    throw new ApiError(
      envelope?.code ?? API_ERROR.UNKNOWN,
      envelope?.message ?? "요청을 처리하지 못했습니다",
      response.status,
    );
  }

  /*
   * 성공 응답의 data가 null인 계약은 공개 API에 없다 — 그래도 null이 오면 화면이 `undefined`를
   * 그리다 엉뚱한 자리에서 죽으므로 여기서 오류로 세운다.
   */
  if (envelope.data === null) {
    throw new ApiError(API_ERROR.UNKNOWN, "서버 응답이 비어 있습니다", response.status);
  }

  return envelope.data;
}

/** 쿼리 문자열 조립 — 값이 없는 항목은 아예 싣지 않는다(빈 값도 필터로 읽히는 서버가 있다) */
export function toQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
