import { ROUTES } from "@/shared/config/routes";
import { currentPath, withNextParam } from "@ssccops/auth";
import { createClient } from "@ssccops/auth/supabase/client";

/*
 * 끝 슬래시를 떼어 둔다.
 *
 * 호출부는 전부 "/v1/..." 처럼 슬래시로 시작하는 경로를 넘기므로, 환경변수 값에 끝 슬래시가
 * 하나라도 붙어 있으면 그 순간 모든 요청이 `https://.../v1/...` 가 아니라 `https://...//v1/...`
 * 로 나간다(배포 dev 가 실제로 그 상태였다). 오늘은 대부분의 서버·프록시가 흡수하지만,
 * **전 요청의 경로가 환경변수 값의 마지막 글자 하나에 매달려 있다는 것 자체**가 문제다 —
 * 경로를 엄격히 보는 프록시·라우터를 앞에 두는 날 전 화면이 한꺼번에 404 가 되고, 그때
 * 원인이 `.env` 의 슬래시 한 글자라는 것을 짚기는 어렵다.
 *
 * 값이 비어 있으면 빈 문자열이 아니라 undefined 로 둔다 — 미설정을 아래에서
 * CLIENT_CONFIG_MISSING 으로 갈라내야 하는데, 빈 문자열로 뭉개면 그 분기가 사라진다.
 */
// `/\/+$/`는 되돌아가는 정규식이지만 입력이 배포 설정값이라 닿을 일이 없다 (#401 · S8786)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || undefined;

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
 * 인증을 실어 요청을 보내고 **`Response`를 그대로** 돌려준다 — 본문을 읽지 않는다.
 *
 * {@link request}(봉투를 읽는다)와 {@link apiFetchStream}(본문을 흘려 읽는다)이 여기서 갈린다.
 * **갈리기 전까지가 같아야 하는 것**이 이 함수를 뽑은 이유다: 토큰 주입, 401 갱신 후 한 번
 * 재시도, 그래도 401이면 로그아웃 후 재로그인. 스트리밍만 자기 fetch를 직접 부르면 그 경로에서만
 * 세션 만료가 다르게 다뤄지고, 하필 그 화면은 오래 열어 두는 패널이라 만료를 가장 잘 만난다.
 *
 * 본문을 읽지 않으므로 **봉투 판정(`success`·403 SIGNUP_REQUIRED)은 호출부의 몫**이다 — 한쪽은
 * JSON 한 덩이를 기다리고 다른 쪽은 이벤트 흐름을 받는데, 그 둘을 한 함수가 할 수는 없다.
 */
async function sendAuthed(path: string, init?: RequestInit): Promise<Response> {
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
    /*
     * FormData 본문에는 Content-Type을 **손으로 넣지 않는다** (#57 · CSV 이관).
     *
     * multipart/form-data 헤더에는 파트를 가르는 boundary 문자열이 함께 실려야 하는데 그 값을
     * 아는 것은 브라우저뿐이다. 여기서 "multipart/form-data"만 적어 보내면 boundary가 빠진 채
     * 나가고, 서버는 파트를 하나도 찾지 못해 파일이 비어 있다고 답한다 — 화면에서는 "CSV 파일을
     * 읽을 수 없습니다"로만 보여 원인을 짚기 어려운 종류의 실패다. 값을 비워 두면 fetch가
     * boundary까지 붙여 스스로 채운다.
     */
    const isMultipart =
      typeof FormData !== "undefined" && init?.body instanceof FormData;
    if (init?.body !== undefined && !isMultipart && !headers.has("Content-Type")) {
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

  return response;
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
  const response = await sendAuthed(path, init);
  const envelope = await readEnvelope<T>(response);

  if (!response.ok || envelope?.success !== true) {
    throw toApiError(response, envelope?.code ?? null, envelope?.message ?? null);
  }

  return envelope;
}

/**
 * 실패한 응답 → {@link ApiError}. **403 SIGNUP_REQUIRED의 리다이렉트까지 여기서 끝낸다.**
 *
 * 봉투를 읽는 경로와 스트리밍 경로가 함께 쓴다 — 스트리밍의 **첫 바이트 전** 거절은 종전
 * 그대로 상태 코드 + 봉투이므로(서버 #447), 그 판정이 두 벌이 되면 «패널에서만 가입 화면으로
 * 가지 않는» 상태가 생긴다.
 */
function toApiError(response: Response, code: string | null, message: string | null): ApiError {
  const resolved = code ?? `HTTP_${response.status}`;
  if (response.status === 403 && resolved === API_ERROR.SIGNUP_REQUIRED) {
    redirectToSignup();
  }
  return new ApiError(
    resolved,
    message ?? `요청이 실패했습니다 (HTTP ${response.status})`,
    response.status,
  );
}

/** 단건 호출 — 봉투를 벗겨 data만 돌려준다 */
export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const envelope = await request<T>(path, init);
  return envelope.data as T;
}

/**
 * 파일 업로드 호출 (multipart/form-data · #57 CSV 이관).
 *
 * `apiFetch`와 **같은 경로**를 탄다 — 토큰 주입도, 401 갱신·재로그인도, 403 SIGNUP_REQUIRED
 * 처리도, 오류를 `ApiError`로 통일하는 것도 그대로다. 여기서 fetch를 직접 부르는 함수를 따로
 * 만들면 그 경로만 세션 만료를 다르게 다루게 되고, 파일을 고른 뒤 업로드에서만 조용히 실패한다.
 *
 * 갈리는 것은 본문의 모양뿐이라 별도 함수를 둔 이유도 그 하나다 — 호출부가 `JSON.stringify`
 * 대신 `FormData`를 넘긴다는 사실을 타입으로 못 박는다(문자열을 넘기면 곧바로 타입 오류다).
 *
 * 401 재시도에서 **같은 FormData를 다시 보낸다.** FormData는 스트림이 아니라 값의 목록이라
 * fetch가 요청마다 새로 직렬화하므로 두 번 보내도 두 번째가 빈 본문이 되지 않는다.
 */
export async function apiUpload<T = unknown>(path: string, form: FormData): Promise<T> {
  const envelope = await request<T>(path, { method: "POST", body: form });
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

/* ── 흘려 받기 (SSE) ───────────────────────────────────────── */

/**
 * 이벤트를 가르는 빈 줄 — `\n\n` 또는 `\r\n\r\n`.
 *
 * `g` 플래그를 쓰지 않는다. 그것을 붙이면 정규식이 `lastIndex`를 들고 다니는데, 여기서는 같은
 * 값을 **버퍼가 바뀔 때마다 처음부터** 다시 찾아야 한다 — 그 상태가 남으면 두 번째 호출이
 * 버퍼 중간부터 훑어 앞의 이벤트를 건너뛴다.
 */
const SSE_EVENT_SEPARATOR = /\r?\n\r?\n/;

/** SSE 이벤트 하나 — 이름과 `data:` 줄을 이어 붙인 본문 */
export interface SseEvent {
  /** 서버가 붙인 이벤트 이름. 안 붙였으면 `"message"`(SSE 기본값) */
  event: string;
  data: string;
}

/**
 * `text/event-stream` 응답을 **이벤트 단위로 흘려 받는다** (서버 #447 · #464).
 *
 * ⚠️ **이 경로에만 `ApiResponse` 봉투가 없다 — 전역 규약의 유일한 예외다.** 봉투는 «요청 하나에
 * 응답 하나»를 전제로 `success`·`code`·`message`를 매기는데 SSE는 한 응답 안에서 이벤트가 여러 번
 * 나가므로 그 셋이 조각마다 되풀이될 뿐 아무것도 말하지 않는다(서버 `AssistantController` 주석).
 * 그래서 `apiFetch`를 그대로 쓸 수 없고, **`data`를 무엇으로 읽을지는 호출부가 정한다** — 여기서는
 * 이름과 문자열까지만 올린다.
 *
 * **첫 바이트 전의 거절은 종전 그대로다.** 서버가 404·413·503·403·429·400을 상태 코드 + 봉투로
 * 내리고 `SseEmitter`는 그 뒤에야 열리므로, 여기서도 응답이 성공이 아니면 **한 글자도 내보내지
 * 않고** `ApiError`를 던진다 — 호출부의 오류 처리가 비스트리밍 경로와 같은 한 벌로 선다.
 * 흘려보내기 **시작한 뒤의** 실패는 상태 코드를 바꿀 수 없어 서버가 `error` 이벤트로 내리며,
 * 그것은 오류가 아니라 **이벤트로** 여기를 지나간다.
 *
 * `EventSource`를 쓰지 않은 이유는 그것이 **GET 전용**이라서다 — 질문 본문을 POST로 보내야 하고
 * `Authorization` 헤더도 실을 수 없다(쿼리스트링에 토큰을 얹는 것은 로그에 남는다).
 *
 * `signal`로 끊으면 `fetch`가 던지는 `AbortError`를 **삼킨다** — 끊은 쪽이 이미 아는 사실이라
 * 오류로 올리면 호출부마다 «내가 끊은 것인가»를 다시 가려야 한다.
 */
export async function* apiFetchStream(
  path: string,
  init?: RequestInit,
): AsyncGenerator<SseEvent> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "text/event-stream");

  const response = await sendAuthed(path, { ...init, headers });

  /*
   * 성공이 아니면 본문은 이벤트 흐름이 아니라 **봉투 하나**다 — 서버가 첫 바이트 전에 끊은
   * 것이므로 종전 경로와 똑같이 읽어 `ApiError`로 던진다.
   */
  if (!response.ok) {
    const envelope = await readEnvelope<unknown>(response);
    throw toApiError(response, envelope?.code ?? null, envelope?.message ?? null);
  }

  /*
   * 본문이 없는 200 — 프록시가 이벤트 흐름을 이해하지 못하고 끊은 모양이다. 이벤트를 하나도
   * 받지 못한 것이 «답이 비었다»로 조용히 흐르지 않게 네트워크 오류로 세운다.
   */
  if (!response.body) {
    throw new ApiError(API_ERROR.NETWORK_ERROR, "서버 응답을 읽을 수 없습니다");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  /*
   * 아직 이벤트 하나를 이루지 못한 꼬리. **청크 경계는 이벤트 경계와 무관하다** — 한 청크에
   * 이벤트가 여럿 들어오기도, 이벤트 하나가 청크 여럿에 걸치기도 한다.
   */
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      /* `stream: true` — 멀티바이트 글자가 청크 경계에 걸려 잘리는 것을 디코더가 이어 준다 */
      buffer += decoder.decode(value, { stream: true });

      /*
       * 이벤트는 빈 줄로 갈린다. `\r\n`은 프로토콜이 허용하는 줄바꿈이라 함께 받는다 —
       * 지금 서버는 `\n`만 쓰지만 사이에 프록시가 끼면 바뀔 수 있는 종류의 값이다.
       *
       * **구분자의 길이를 실제로 재서 건너뛴다**(`\n\n`은 2, `\r\n\r\n`은 4). 고정 길이로
       * 두면 `\r\n`을 쓰는 프록시 뒤에서 남은 `\r`이 다음 이벤트의 첫 글자로 붙어, 그 줄의
       * `event`·`data` 이름이 통째로 어긋난다.
       */
      let separator = SSE_EVENT_SEPARATOR.exec(buffer);
      while (separator !== null) {
        const raw = buffer.slice(0, separator.index);
        buffer = buffer.slice(separator.index + separator[0].length);
        const parsed = parseSseEvent(raw);
        if (parsed) yield parsed;
        separator = SSE_EVENT_SEPARATOR.exec(buffer);
      }
    }
  } catch (failure) {
    /* 우리가 끊었다 — 호출부가 이미 아는 사실이라 오류로 올리지 않는다 */
    if (init?.signal?.aborted) return;
    if (failure instanceof ApiError) throw failure;
    throw new ApiError(API_ERROR.NETWORK_ERROR, "서버와의 연결이 끊어졌습니다");
  } finally {
    /*
     * 다 읽지 못하고 나가는 길(호출부의 `break`·예외·중단)에서 연결을 놓는다. 이것이 없으면
     * 사용자가 패널을 닫아도 서버는 끝까지 생성하며 무료 쿼터를 쓴다(서버 §11).
     */
    void reader.cancel().catch(() => {});
  }
}

/**
 * 이벤트 한 덩이 → `{event, data}`.
 *
 * `data:` 줄이 여럿이면 **줄바꿈으로 이어 붙인다**(SSE 규약). 주석 줄(`:`로 시작)은 버린다 —
 * 연결을 살려 두는 heartbeat이 그 모양으로 온다.
 */
function parseSseEvent(raw: string): SseEvent | null {
  let event = "message";
  const data: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    if (line === "" || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    /* `field: value` — 콜론 뒤 공백 하나는 규약상 구분자라 값에 넣지 않는다 */
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");

    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }

  /* `data:`가 한 줄도 없으면 이벤트가 아니다(주석·`id:`만 온 덩이) */
  return data.length === 0 ? null : { event, data: data.join("\n") };
}
