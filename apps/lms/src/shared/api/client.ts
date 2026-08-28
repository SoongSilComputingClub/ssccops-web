/*
 * 학술 공개 앱 API 호출 유틸 (#169).
 *
 * apps/www의 같은 파일에서 옮겨 왔다 — 봉투 벗기기와 `ApiError` 변환은 그대로다. 어드민의
 * `shared/lib/api/client.ts`와 **일부러 나눠 둔** 이유도 같다: 저쪽은 401·403 SIGNUP_REQUIRED를
 * 리다이렉트까지 끝내는데, 이 앱에는 밀어낼 로그인 화면이 없어(로그인은 지금 보고 있는 화면
 * 위에서 시작한다) 그 로직을 옮기면 갈 곳 없는 리다이렉트만 도는 길이 생긴다. 401·403은 오류로
 * 올려 보내고 화면(과 공용 로그인 게이트)이 안내로 그린다.
 *
 * ── www와 갈리는 것: 커서 페이징 봉투를 다룬다 ──────────────────────
 * www의 공개 목록 계약에는 `page` 봉투가 없어 이 파일도 다루지 않았다. 학술 목록(스터디/
 * 프로젝트·회차 이력 등)은 어드민과 같은 커서 페이징이라 `page`가 `data` 옆에 실려 온다 —
 * 그래서 어드민에서 {@link PageEnvelope}·{@link ApiListResult}·{@link apiFetchList}를 옮겼다.
 * **옮긴 것은 봉투 처리뿐이고, 어드민 apiFetchList가 타는 401 갱신·재로그인 리다이렉트는
 * 함께 옮기지 않았다**(#169 — 그 동작은 www 규약과 어긋난다).
 *
 * 인증 토큰을 실어 보내는 것은 옆의 `authed-client.ts`(서버 컴포넌트)·`browser-client.ts`
 * (브라우저)가 맡는다 — 둘 다 이 파일의 `apiFetch`를 통과한다.
 *
 * ── apiUpload는 옮기지 않았다 ────────────────────────────────────
 * 어드민에는 multipart 업로드 헬퍼(`apiUpload`)가 있지만 학술 인증사진은 presigned PUT
 * (서버가 URL을 내려주고 브라우저가 S3에 직접 올린다)이라 이 앱을 거치지 않는다(#169 —
 * "확인 후 결정"). 필요해지면 그때 어드민에서 옮긴다.
 */

/*
 * 끝 슬래시를 떼어 둔다 — 호출부는 전부 "/v1/..."처럼 슬래시로 시작하는 경로를 넘기므로,
 * 환경변수 값에 끝 슬래시가 붙어 있으면 모든 요청이 `https://...//v1/...`로 나간다
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
  /** 커서 목록 응답에만 실린다. 단건·오류 응답에서는 아예 빠져 있다 */
  page?: PageEnvelope | null;
}

/**
 * 커서 페이징 봉투 (global.apipayload.PageResponse · 어드민에서 옮김).
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
 * ssccops-server 호출 — 성공한 봉투를 통째로 돌려준다.
 *
 * 봉투째 돌려주는 것은 목록 응답의 `page`가 `data` 옆에 오기 때문이다 — 호출부는 대개
 * {@link apiFetch}(data만)나 {@link apiFetchList}(data + page)를 쓴다.
 *
 * **캐시하지 않는다.** Next 16의 `fetch`는 기본이 no-store지만 여기서 명시해 둔다 — 이 앱은
 * 로그인한 본인의 데이터를 그리는 화면이 대부분이라 캐시된 응답이 다른 사람에게 새어 나가는
 * 것이 가장 곤란한 어긋남이고, 그 판단을 프레임워크 기본값에 맡기고 싶지 않다.
 */
async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  if (!API_BASE_URL) {
    /*
     * 값이 없으면 `undefined/v1/...`로 요청이 나가 404로 둔갑한다. 설정 누락은 런타임 오류가
     * 아니라 배포 실수이므로 원인을 그대로 드러낸다.
     */
    throw new ApiError(
      API_ERROR.CONFIG_MISSING,
      "서버 주소가 설정되지 않아 정보를 불러올 수 없습니다",
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

  return envelope;
}

/**
 * 단건 호출 — 봉투를 벗겨 `data`만 돌려준다.
 *
 * 성공 응답의 `data`가 null인 계약은 이 앱에 없다 — 그래도 null이 오면 화면이 `undefined`를
 * 그리다 엉뚱한 자리에서 죽으므로 여기서 오류로 세운다.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const envelope = await request<T>(path, init);
  if (envelope.data === null) {
    throw new ApiError(API_ERROR.UNKNOWN, "서버 응답이 비어 있습니다");
  }
  return envelope.data;
}

/**
 * 커서 목록 호출 — data 배열과 page 봉투를 함께 돌려준다 (어드민 apiFetchList에서 옮김).
 *
 * `apiFetch`로 목록을 받으면 `page`가 버려져 다음 페이지가 있는지조차 알 수 없다. 학술 목록은
 * 첫 페이지만 보여 주고 조용히 끊기는 대신 이 함수를 써서 `hasNext`·`nextCursor`를 화면까지
 * 올린다.
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
