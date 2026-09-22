/**
 * table: noti_type_rcpn — 알림_유형_수신
 * 알림 유형 하나가 어느 앱에 보일지를 정하는 기준표다 (ADR-0047 · 서버 #535).
 */

/* ── 서버 연동 타입 (ssccops-server NotificationTypeRouteResponse) ── */

/*
 * 이 슬라이스는 `entities/notification`(내 알림 목록)과 따로다.
 *
 * 그쪽은 «나에게 온 알림 한 건»을 다루고 이쪽은 «시스템 전체의 수신 정책»을 다룬다 — 부르는
 * 엔드포인트도(`/v1/notifications` vs `/v1/notifications/types`) 요구 권한도(인증만 vs SUPER)
 * 다르다. entities 슬라이스끼리는 참조할 수 없으므로 앱 코드 어휘가 양쪽에 한 벌씩 있게 되는데,
 * 그것이 FSD가 의도한 값이다 — 한쪽 화면의 사정으로 다른 쪽 타입을 넓히지 않게 한다.
 */

/**
 * 알림이 보일 앱 (서버 `NotificationApp` · `noti.app_cd`).
 *
 * **배열 순서가 곧 화면 순서다.** 서버도 같은 순서(enum 선언 순)로 내려주며, 웹은 받은 값을
 * 이 순서로 다시 정렬해 «고친 값과 저장된 값이 같은가»를 순서까지 포함해 비교할 수 있게 한다.
 */
export const NOTIFICATION_APPS = ["ADMIN", "LMS", "WWW"] as const;

export type NotificationApp = (typeof NOTIFICATION_APPS)[number];

/**
 * 체크박스에 붙는 앱 이름.
 *
 * 코드 어휘는 서버가 정하지만 이 표시명은 화면의 말이다 — 계정 메뉴의 «홍보 사이트»·«학술 LMS»와
 * 달리 체크박스 세 개가 한 줄에 서므로 좁은 화면에서 깨지지 않게 짧게 둔다.
 */
export const NOTIFICATION_APP_LABEL: Record<NotificationApp, string> = {
  ADMIN: "운영",
  LMS: "학술",
  WWW: "홈페이지",
};

/** «설정 › 알림 유형»의 한 줄 */
export interface NotificationTypeRoute {
  /** 유형 코드 (서버 `NotificationType`) — 저장 주소의 경로 값이다 */
  type: string;
  /** 화면에 그대로 쓰는 유형 이름. 서버 enum의 label이라 웹이 사전을 따로 두지 않는다 */
  label: string;
  /** 이 유형의 알림이 보일 앱. `followsSendingApp`이면 빈 배열이다 */
  apps: NotificationApp[];
  /**
   * 기준표에 행이 하나도 없는 유형 — 그 알림 행 자신의 앱(= 보낸 앱)을 따른다 (ADR-0047).
   *
   * «아직 정하지 않았다»의 안전한 기본값이라 화면은 «보낸 앱을 따릅니다»로 그린다. 한 번
   * 저장하면 false가 되고, 다시 이 상태로 돌리는 조작은 없다(서버에 DELETE가 없다).
   */
  followsSendingApp: boolean;
}
