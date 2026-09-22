import { apiFetch } from "@/shared/lib/api/client";
import {
  NOTIFICATION_APPS,
  type NotificationApp,
  type NotificationTypeRoute,
} from "../model/types";

/*
 * 알림 유형별 수신 앱 API (ssccops-server #535 · ADR-0047 · NotificationTypeRoutingController).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — 다른 도메인이 잡아 둔 규칙 그대로다.
 *
 * 인가는 두 핸들러 모두 `SUPER`다(컨트롤러 클래스 레벨). 조회부터 막혀 있으므로 목록은 보이는데
 * 저장만 403인 상태가 없다 — 하위 업무 유형과 갈리는 지점이다. 그래도 저장 오류 문구를 따로 두는
 * 것은 권한이 화면을 열어 둔 사이에 회수될 수 있기 때문이다.
 */

/**
 * 이 API가 돌려주는 오류 코드 (ssccops-server NotificationErrorCode).
 *
 * **enum 이름이 아니라 본문에 실리는 코드 문자열이다.** 서버의 `NOTIFICATION_TYPE_NOT_FOUND`는
 * 코드로 `"NOT_FOUND"`를, `EMPTY_NOTIFICATION_ROUTE`는 `"VALIDATION_FAILED"`를 내린다.
 */
export const NOTIFICATION_TYPE_ERROR = {
  /** 수신 앱을 하나도 주지 않았다 (400 EMPTY_NOTIFICATION_ROUTE · ADR-0047 «최소 한 앱») */
  EMPTY_ROUTE: "VALIDATION_FAILED",
  /** 기준 코드에 없는 유형 (404) — 목록을 다시 불러와야 한다 */
  NOTIFICATION_TYPE_NOT_FOUND: "NOT_FOUND",
  /** SUPER 권한 없음 (403) */
  FORBIDDEN: "FORBIDDEN",
} as const;

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface NotificationTypeRouteResponse {
  type: string;
  label: string | null;
  apps: string[] | null;
  followsSendingApp: boolean;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

function isNotificationApp(value: string): value is NotificationApp {
  return (NOTIFICATION_APPS as readonly string[]).includes(value);
}

/*
 * 앱 배열을 `NOTIFICATION_APPS` 순으로 다시 세운다.
 *
 * 서버도 enum 선언 순으로 정렬해 주지만(DTO 주석), 화면은 «고친 값과 저장된 값이 같은가»를
 * 배열끼리 견주어 판정한다 — 순서가 한 번이라도 어긋나면 바꾼 것이 없는 줄이 «저장하지 않음»으로
 * 남는다. 웹이 아는 순서로 한 번 더 세워 두면 그 판정이 서버의 정렬에 기대지 않는다.
 *
 * 모르는 코드는 버린다 — 서버가 앱을 늘리면 그 값은 체크박스가 없어 화면에 그릴 자리가 없고,
 * 들고만 있으면 저장할 때 화면에 보이지 않던 값이 함께 실려 나간다.
 */
function toApps(apps: string[] | null): NotificationApp[] {
  const given = new Set((apps ?? []).filter(isNotificationApp));
  return NOTIFICATION_APPS.filter((app) => given.has(app));
}

function toRoute(res: NotificationTypeRouteResponse): NotificationTypeRoute {
  return {
    type: res.type,
    // label이 비면 코드로 떨어진다 — 줄 제목이 글자 없이 그려지는 것보다 낫다
    label: res.label ?? res.type,
    apps: toApps(res.apps),
    followsSendingApp: res.followsSendingApp,
  };
}

/* ── 목록 ──────────────────────────────────────────────────── */

/**
 * GET /v1/notifications/types — 유형 전부와 그 유형이 보일 앱.
 *
 * 유형 목록은 코드가 아는 닫힌 집합이라 기준표에 행이 없는 유형도 줄로 온다(그때
 * `followsSendingApp`이 true). 커서 페이징이 없다 — 열두 줄짜리 기준 데이터라 서버가 전량을
 * 한 번에 내린다. 응답 순서가 곧 표시 순서다.
 */
export async function fetchNotificationTypeRoutes(): Promise<NotificationTypeRoute[]> {
  const routes = await apiFetch<NotificationTypeRouteResponse[] | null>(
    "/v1/notifications/types",
  );
  return (routes ?? []).map(toRoute);
}

/* ── 수신 앱 저장 ──────────────────────────────────────────── */

/**
 * PUT /v1/notifications/types/{type} — 그 유형의 수신 앱을 **통째로 교체**한다.
 *
 * 체크박스 화면이 «지금 켜진 것 전부»를 보낸다. 더하기·빼기로 나뉜 엔드포인트가 없는 것은
 * 화면이 체크박스라 «지금 상태»가 곧 요청이기 때문이다(서버 DTO 주석).
 *
 * 빈 배열은 서버가 400으로 거절한다 — 화면도 같은 것을 막지만(ADR-0047 «최소 한 앱») 마지막
 * 자리는 서버다. 여기서 미리 걸러 400을 흉내 내지 않는다: 그러면 판정이 두 벌이 된다.
 *
 * **응답의 한 줄을 그대로 쓴다.** 목록을 다시 받지 않는 것은 유형 목록이 닫힌 집합이고 줄의
 * 자리가 코드로 고정이라, 저장이 바꿀 수 있는 것이 이 한 줄의 `apps`·`followsSendingApp`뿐이기
 * 때문이다(서버가 정렬을 정하는 목록과 갈리는 지점).
 */
export async function replaceNotificationTypeApps(
  type: string,
  apps: NotificationApp[],
): Promise<NotificationTypeRoute> {
  const saved = await apiFetch<NotificationTypeRouteResponse>(
    `/v1/notifications/types/${encodeURIComponent(type)}`,
    { method: "PUT", body: JSON.stringify({ apps }) },
  );
  return toRoute(saved);
}

/* ── 보낸 앱 따름으로 되돌리기 ─────────────────────────────── */

/**
 * DELETE /v1/notifications/types/{type} — 그 유형의 기준표 행을 전부 지운다 (서버 #537).
 *
 * 지운 뒤의 유형은 **그 알림 행 자신의 앱**을 따른다(ADR-0047 «미등록»). 빈 배열을 PUT 하는
 * 길은 서버가 400으로 막으므로(«최소 한 앱») 기본값으로 가는 길은 이 요청 하나다.
 *
 * **204가 아니라 200 + 본문이다**(서버 컨트롤러 주석). 응답은 목록·저장과 같은 한 줄이고
 * `followsSendingApp`이 true라, 화면은 되돌린 직후 목록을 다시 받지 않고 그 줄만 다시 그린다.
 *
 * **멱등이다** — 이미 미등록인 유형에도 200이 온다. 그래도 화면은 그 줄에서 버튼을 감춘다:
 * 누를 것이 없는 자리에 버튼을 두면 «지금 어느 규칙으로 도는가»가 읽히지 않는다.
 */
export async function clearNotificationTypeApps(
  type: string,
): Promise<NotificationTypeRoute> {
  const cleared = await apiFetch<NotificationTypeRouteResponse>(
    `/v1/notifications/types/${encodeURIComponent(type)}`,
    { method: "DELETE" },
  );
  return toRoute(cleared);
}
