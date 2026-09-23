import type { NotificationPage, PushTestRequest, PushTestResult } from "./notification";
import type { PushApp } from "./service-worker";

/*
 * `/v1/notifications` — 내 알림의 호출 한 벌 (ssccops#446 «API 계약» · ADR-0045 · ADR-0047 · #665).
 *
 * 세 앱이 같은 다섯 호출을 각자 적고 있었다(`entities/notification/api/notifications.ts` 69·66·61줄).
 * 경로도 파라미터도 응답도 계약이 정한 하나라 갈릴 자리가 없다 — 갈리는 것은 **누가 보내느냐**뿐이라
 * 그 하나(`apiFetch`)를 받아 나머지를 여기서 만든다.
 *
 * 목록은 `apiFetchList`(배열 + `page` 봉투)가 아니라 **`data`가 `{ items, nextCursor, unreadCount }`**다 —
 * 계약 표가 그렇게 적었고 `unreadCount`가 목록과 함께 와야 종 배지를 따로 부르지 않는다. 서버가 `page`
 * 봉투 쪽으로 만들면 이 파일 하나를 고친다.
 *
 * `app`을 주면 **그 앱이 수신 앱인 알림만** 온다(server#535 · ADR-0047 — 기준표 `noti_type_rcpn`이
 * 정하고, 등록된 행이 없는 유형은 그 알림 행 자신의 `app`을 따른다). 함께 오는 `unreadCount`도 같은
 * 필터를 지난다. 주지 않으면 앱과 무관하게 전부다(«전체» 칩). 기준 코드에 없는 값은 400.
 *
 * 남의 알림은 404 — 화면은 «없는 알림»으로만 다룬다.
 */

/**
 * 앱의 `apiFetch` — 봉투를 벗겨 `data`만 돌려주고 실패는 그 앱의 `ApiError`로 세운다.
 *
 * 인증 헤더도 401·403 처리도 앱마다 다르다(admin은 재로그인·가입 화면까지 끝내고 www·lms는 오류로
 * 올린다) — 그래서 이 패키지는 보내는 일을 하지 않고 받아 쓴다(`usePushSubscription`과 같은 자리).
 */
export type NotificationFetch = <T>(path: string, init?: RequestInit) => Promise<T>;

/** `GET /v1/notifications` — 커서 페이징(페이지 번호 없음) + 범위 필터 */
export interface NotificationListParams {
  cursor?: string | null;
  size?: number;
  app?: PushApp | null;
}

/** `POST /v1/notifications/{id}/read` 응답 */
export interface NotificationReadResult {
  notificationId: number;
  readAt: string;
}

export interface NotificationApi {
  list: (params?: NotificationListParams) => Promise<NotificationPage>;
  unreadCount: (params?: { app?: PushApp | null }) => Promise<{ unreadCount: number }>;
  read: (notificationId: number) => Promise<NotificationReadResult>;
  readAll: () => Promise<{ updated: number }>;
  sendTest: (request: PushTestRequest) => Promise<PushTestResult>;
}

/** 빈 값은 빼고 붙인다 — 앱의 `toQuery`와 같은 규칙(없는 파라미터와 빈 파라미터는 다른 질의다) */
function toQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/**
 * 앱의 `apiFetch` 하나로 알림 호출 한 벌을 만든다.
 *
 * 앱은 `entities/notification`에서 이것과 `CURRENT_APP`(이 앱의 `PushApp`)만 둔다 — 경로·파라미터가
 * 세 벌로 갈리지 않게.
 */
export function createNotificationApi(apiFetch: NotificationFetch): NotificationApi {
  return {
    list: (params = {}) =>
      apiFetch<NotificationPage>(
        `/v1/notifications${toQuery({
          cursor: params.cursor,
          size: params.size,
          app: params.app,
        })}`,
      ),

    unreadCount: (params = {}) =>
      apiFetch<{ unreadCount: number }>(
        `/v1/notifications/unread-count${toQuery({ app: params.app })}`,
      ),

    read: (notificationId: number) =>
      apiFetch<NotificationReadResult>(`/v1/notifications/${notificationId}/read`, {
        method: "POST",
      }),

    readAll: () =>
      apiFetch<{ updated: number }>("/v1/notifications/read-all", {
        method: "POST",
      }),

    /**
     * 테스트 알림 — 호출자 자신에게 알림 행 + 자기 구독 전부로 푸시 (ssccops#454 · #616). `app`은 링크가
     * 갈 «내 정보»의 앱. 1분 3회를 넘기면 429 `RATE_LIMITED`(server#529) — 버튼(`@ssccops/pwa/ui`)이
     * 문구로 가른다.
     */
    sendTest: (request: PushTestRequest) =>
      apiFetch<PushTestResult>("/v1/notifications/test", {
        method: "POST",
        body: JSON.stringify(request),
      }),
  };
}
