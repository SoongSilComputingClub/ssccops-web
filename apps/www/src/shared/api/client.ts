/*
 * 공개 API 호출 유틸 (wave2 D1 — 비로그인 완전 공개).
 *
 * 어드민의 `shared/lib/api/client.ts`와 **일부러 나눠 두었다**. 저쪽은 Supabase 세션을 실어
 * 보내고 401·403 SIGNUP_REQUIRED를 리다이렉트까지 끝내는데, 공개 앱은 익명 호출이라 그 로직이
 * 통째로 필요 없다(붙여 두면 로그인 없는 앱에 로그인 화면으로 가는 길만 남는다).
 *
 * 커서 페이징 봉투(`page`)는 공개 목록 계약에 없어 오래 다루지 않았다 — `/me`가 학술 프로그램
 * 목록(`GET /v1/academic-programs?mine=leader` · 커서 페이징)을 그리게 되면서(#518) lms의
 * `apiFetchList`를 봉투 처리만 옮겨 왔다. 공개(익명) 목록 중에는 포스트 목록(#520)만 커서
 * 계약이라 이것을 쓰고, 행사 목록은 여전히 `apiFetch`다.
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
// `/\/+$/`는 되돌아가는 정규식이지만 입력이 배포 설정값이라 닿을 일이 없다 (#401 · S8786)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || undefined;

/** ssccops-server 공통 응답 봉투 (global.apipayload.ApiResponse) — 성공·실패 모두 이 모양이다 */
interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
  /** 커서 목록 응답에만 실린다. 단건·오류 응답에서는 아예 빠져 있다 */
  page?: PageEnvelope | null;
}

/**
 * 커서 페이징 봉투 (global.apipayload.PageResponse · lms에서 옮김).
 *
 * 페이지 번호가 없는 것은 서버가 offset이 아니라 커서로 자르기 때문이다 — 다음 페이지는
 * `nextCursor`를 그대로 되돌려 주는 방식이고, 마지막 페이지면 `hasNext`가 false다.
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
 * 한 번의 fetch가 기다리는 상한 (#618 · ssccops#455).
 *
 * dev www는 Cloudflare Worker에서 SSR을 하고, 그 워커가 `dev.api`(원서버 직결)로 보내는 fetch가
 * 간헐적으로 스톨했다 — 2026-09-22 실측으로 `/about`이 20번 중 3번 30초를 넘겼고 1~4분 뒤에야
 * 200이 왔다. 워커·API·같은 시각의 다른 경로는 전부 멀쩡했으니 엣지→원서버 연결 하나가 죽은
 * 것이고, `fetch`에 상한이 없으면 TCP가 포기할 때까지 화면이 통째로 기다린다. 6초는 정상
 * 응답(0.1~0.5초)의 열 배가 넘고 두 번 기다려도 사람이 «죽었다»고 판단하는 선(≈15초) 아래다.
 */
const FETCH_TIMEOUT_MS = 6000;

/**
 * 타임아웃 + 안전한 요청만 1회 재시도.
 *
 * 재시도는 GET·HEAD(메서드 없음 포함)에만 한다 — POST는 서버에 닿았는지 모르는 채로 다시 보내면
 * 두 번 만들 수 있다. 재시도는 **새 연결**을 타게 되는 것이 요점이라 지연을 두지 않는다.
 * 호출자가 `signal`을 주면 그것을 그대로 쓰고(중단 의도가 있다) 타임아웃은 걸지 않는다.
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const retryable = method === "GET" || method === "HEAD";
  const attempts = retryable ? 2 : 1;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetch(url, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      if (attempt >= attempts) {
        throw new ApiError(
          API_ERROR.NETWORK_ERROR,
          "서버 응답이 늦습니다 — 잠시 후 다시 시도해주세요",
        );
      }
    }
  }
}

/**
 * 봉투를 벗기고 `data`·`page`와 응답 상태를 함께 돌려준다 — 상태는 아래 공개 함수들만 쓴다.
 *
 * **캐시하지 않는다.** Next 16의 `fetch`는 기본이 no-store지만 여기서 명시해 둔다 — 게시 철회한
 * 행사가 캐시에 남아 계속 보이는 것이 이 앱에서 가장 곤란한 종류의 어긋남이고, 그 판단을
 * 프레임워크 기본값에 맡기고 싶지 않기 때문이다.
 */
async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; page: PageEnvelope | null; status: number }> {
  if (!API_BASE_URL) {
    /*
     * 값이 없으면 `undefined/public/v1/...`로 요청이 나가 404로 둔갑한다. 설정 누락은 런타임
     * 오류가 아니라 배포 실수이므로 원인을 그대로 드러낸다.
     */
    throw new ApiError(
      API_ERROR.CONFIG_MISSING,
      "지금은 행사 정보를 불러올 수 없습니다 — 잠시 후 다시 시도해주세요",
    );
  }

  const response = await fetchWithRetry(`${API_BASE_URL}${path}`, { cache: "no-store", ...init });

  const envelope = await readEnvelope<T>(response);

  if (!response.ok || !envelope?.success) {
    throw new ApiError(
      envelope?.code ?? API_ERROR.UNKNOWN,
      envelope?.message ?? "요청을 처리하지 못했습니다",
      response.status,
    );
  }

  return { data: envelope.data, page: envelope.page ?? null, status: response.status };
}

/**
 * 공개 API 호출 — 봉투를 벗겨 `data`만 돌려주고, 실패는 전부 {@link ApiError}로 통일한다.
 *
 * 대부분의 조회가 이것을 쓴다. 성공 응답의 `data`가 null인 계약은 이 앱의 조회 대부분에 없고,
 * 그래도 null이 오면 화면이 `undefined`를 그리다 엉뚱한 자리에서 죽으므로 여기서 오류로 세운다.
 *
 * **"없음"을 `data: null` 200으로 주는 조회는 이 함수를 쓰면 안 된다** — 정상 상태가 매번
 * `CLIENT_UNKNOWN_ERROR`로 둔갑한다(#197이 실제로 그것이었다). 그런 조회는
 * {@link apiFetchNullable}을 쓰고 "없음"을 화면까지 null로 올린다.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data, status } = await request<T>(path, init);
  if (data === null) {
    throw new ApiError(API_ERROR.UNKNOWN, "서버 응답이 비어 있습니다", status);
  }
  return data;
}

/**
 * 공개 API 호출 — 봉투를 벗겨 `data`를 돌려준다. **`data`가 null인 성공 응답도 그대로 null이다.**
 *
 * "작성 중인 것이 없으면 204가 아니라 `data`가 null인 200"처럼 **없음을 null로 표현하는 계약**이
 * 서버에 실제로 있다(초안 조회 · #197). 그런 조회만 이 함수를 부르고 "없음"을 화면까지 null로
 * 올린다 — 어느 쪽이 계약인지 호출부에서 한눈에 보이게 {@link apiFetch}와 나눠 둔 것이다.
 */
export async function apiFetchNullable<T>(path: string, init?: RequestInit): Promise<T | null> {
  return (await request<T>(path, init)).data;
}

/**
 * 커서 목록 호출 — `data` 배열과 `page` 봉투를 함께 돌려준다 (lms `apiFetchList`에서 옮김).
 *
 * `apiFetch`로 목록을 받으면 `page`가 버려져 다음 페이지가 있는지조차 알 수 없다. `data`가
 * null이면 빈 배열로 떨어뜨린다 — 목록이 비었다는 것과 응답이 없다는 것을 화면이 다르게 다룰
 * 이유가 없다. 인증 목록(`authed-client.ts`)과 공개 포스트 목록(`entities/content` · #520 —
 * 익명 목록으로는 첫 커서 계약)이 쓴다.
 */
export async function apiFetchList<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiListResult<T>> {
  const { data, page } = await request<T[]>(path, init);
  return { data: data ?? [], page };
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
