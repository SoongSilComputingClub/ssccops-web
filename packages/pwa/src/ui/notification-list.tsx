import { formatDt } from "@ssccops/date";
import type { NotificationItem } from "../notification";
import type { PushApp } from "../service-worker";

/*
 * 알림 목록 — admin `/notifications`·lms(#448)·www(ssccops#453)가 같은 것을 그린다 (ssccops#447).
 *
 * 데이터를 부르지 않는다. 커서 «더 보기»·읽음 처리·이동은 앱의 훅이 하고 이 컴포넌트는 행과 버튼만
 * 그린다 — 두 앱의 `apiFetch`가 다르고(admin은 401·403 리다이렉트까지 끝낸다) 이동 규칙도 앱마다
 * 다르기 때문이다(`@ssccops/form-renderer`가 전송 계층을 모르는 것과 같은 자리).
 *
 * 행은 `<button>`이다 — 안에 다른 버튼·링크가 없어 role 방식이 필요 없다. 안 읽은 행은 왼쪽 점과
 * 굵은 제목으로 가르고 색만으로 가르지 않는다.
 *
 * ── 범위 칩과 꼬리표 (#643 · ADR-0047) ─────────────────────
 * 머리의 «이 앱 | 전체»는 고른 값을 쥐지 않는다 — 누른 것을 `onScopeChange`로 올려보내고 앱의 훅이
 * 다시 조회한다(«이 앱»은 `app=<내 앱>`, «전체»는 파라미터 없이). 값은 화면 상태라 주소에도
 * localStorage에도 남기지 않는다 — 새로 열면 언제나 «이 앱»이다.
 *
 * 꼬리표(«운영 ↗»·«학술 ↗»·«홈페이지 ↗»)는 행의 `app`이 `currentApp`과 다를 때 붙는다. **갈 수
 * 있는지와 무관하다** — 그 앱의 오리진이 없으면 눌러도 머물지만(앱의 `notificationTarget`) «어디
 * 것인가»는 그대로 사실이고, 꼬리표가 없으면 눌러도 아무 일이 없는 행으로만 보인다.
 *
 * 색은 토큰 이름으로만 적는다(`bg-surface`·`text-n500`) — 앱의 `globals.css`가 `@source`로 이
 * 패키지를 가리켜야 클래스가 생성된다(루트 AGENTS.md «함정»).
 */

/** 알림 유형 → 짧은 라벨. 서버 `title`이 이미 문장이라 행의 작은 캡션에만 쓴다 */
export const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  APPROVAL_REQUESTED: "승인 요청",
  APPROVAL_APPROVED: "승인",
  APPROVAL_REJECTED: "반려",
  DEADLINE_DUE: "마감 임박",
  DEADLINE_OVERDUE: "마감 지남",
  // 회원 사건 (ssccops#453) — 낸 응답의 검토 결과 · 행사 참가 상태
  RESPONSE_ACCEPTED: "응답 승인",
  RESPONSE_REJECTED: "응답 반려",
  RESPONSE_CHANGES_REQUESTED: "수정 요청",
  APPLICATION_CONFIRMED: "참가 확정",
  APPLICATION_WAITLISTED: "대기",
  APPLICATION_CANCELLED: "참가 취소",
  // «내 정보»의 테스트 알림 (ssccops#454)
  TEST: "테스트",
};

/** 앱 → 꼬리표 이름 (#643). 화면에서 부르는 이름이지 앱 코드가 아니다 */
export const NOTIFICATION_APP_LABEL: Record<PushApp, string> = {
  ADMIN: "운영",
  LMS: "학술",
  WWW: "홈페이지",
};

/** 목록이 무엇을 부르나 — «이 앱»이면 `app=<내 앱>`, «전체»면 파라미터 없이 (#643 · ADR-0047) */
export type NotificationScope = "app" | "all";

const SCOPE_CHIPS: ReadonlyArray<{ value: NotificationScope; label: string }> = [
  { value: "app", label: "이 앱" },
  { value: "all", label: "전체" },
];

export type NotificationListStatus = "loading" | "ready" | "error";

type NotificationListProps = Readonly<{
  items: NotificationItem[];
  status: NotificationListStatus;
  /** `status === "error"`일 때 한 줄 */
  errorMessage?: string;
  hasNext: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  /** 행을 눌렀다 — 앱이 읽음 처리와 이동을 한다 */
  onOpen: (item: NotificationItem) => void;
  onReadAll: () => void;
  readingAll: boolean;
  /** 이 목록을 그리는 앱 — 행의 `app`이 이것과 다르면 꼬리표가 붙는다 (#643) */
  currentApp: PushApp;
  /** 지금 고른 범위. 값은 앱의 훅이 쥔다(주소·localStorage 없음) */
  scope: NotificationScope;
  /** 칩을 눌렀다 — 앱이 다시 조회한다 */
  onScopeChange: (scope: NotificationScope) => void;
  /**
   * 빈 상태에 «푸시를 켜면 새 알림이 이 기기로 옵니다» + «설정 열기»를 그린다(ssccops#461 · #634) —
   * 페이지의 «알림 설정» 절을 펼치는 함수. 스위치가 이미 켜져 있으면 넘기지 않는다(그 줄이 틀린 말이 된다)
   */
  onOpenSettings?: () => void;
}>;

export function NotificationList(props: NotificationListProps) {
  return (
    <div>
      <ScopeChips scope={props.scope} onChange={props.onScopeChange} />
      <NotificationListBody {...props} />
    </div>
  );
}

function ScopeChips({
  scope,
  onChange,
}: Readonly<{ scope: NotificationScope; onChange: (scope: NotificationScope) => void }>) {
  return (
    <div
      role="group"
      aria-label="알림 범위"
      className="mb-3 inline-flex gap-1 rounded-[12px] border border-line p-[3px]"
    >
      {SCOPE_CHIPS.map((chip) => {
        const on = chip.value === scope;
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(chip.value)}
            className={
              on
                ? "cursor-pointer rounded-[9px] bg-accent px-[13px] py-[5px] text-[13.5px] font-semibold text-on-solid"
                : "cursor-pointer rounded-[9px] px-[13px] py-[5px] text-[13.5px] text-n400 hover:text-accent"
            }
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

function NotificationListBody({
  items,
  status,
  errorMessage,
  hasNext,
  loadingMore,
  onLoadMore,
  onOpen,
  onReadAll,
  readingAll,
  currentApp,
  onOpenSettings,
}: NotificationListProps) {
  const unread = items.filter((item) => item.readAt === null).length;

  if (status === "loading") {
    return <div className="py-[52px] text-center text-[15px] text-n500">불러오는 중…</div>;
  }
  if (status === "error") {
    return (
      <div className="py-[52px] text-center text-[15px] text-danger">
        {errorMessage ?? "알림을 불러오지 못했습니다 — 새로고침해주세요"}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="py-[52px] text-center text-[15px] text-n500">
        <p>아직 알림이 없습니다.</p>
        {onOpenSettings && (
          <>
            <p className="mt-1 text-[13.5px]">푸시를 켜면 새 알림이 이 기기로 옵니다.</p>
            <button
              type="button"
              onClick={onOpenSettings}
              className="mt-3 cursor-pointer rounded-[10px] border border-line-strong px-3 py-[7px] text-[14px] text-n300 hover:border-accent hover:text-accent"
            >
              설정 열기
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center">
        <div className="text-[13.5px] text-n500">
          {unread > 0 ? `안 읽음 ${unread}건` : "모두 읽었습니다"}
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onReadAll}
          disabled={readingAll || unread === 0}
          className="-mx-1 -my-1 inline-flex min-h-6 cursor-pointer items-center rounded-[6px] px-1 py-1 text-[14px] text-accent hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-45"
        >
          모두 읽음
        </button>
      </div>

      <ul className="divide-y divide-hairline rounded-2xl bg-surface shadow-[0_0_0_1px_var(--color-line)]">
        {items.map((item) => (
          <li key={item.notificationId}>
            <NotificationRow item={item} currentApp={currentApp} onOpen={onOpen} />
          </li>
        ))}
      </ul>

      {hasNext && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="cursor-pointer rounded-[12px] border border-line-strong px-4 py-[9px] text-[15px] text-n300 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loadingMore ? "불러오는 중…" : "더 보기"}
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  item,
  currentApp,
  onOpen,
}: Readonly<{
  item: NotificationItem;
  currentApp: PushApp;
  onOpen: (item: NotificationItem) => void;
}>) {
  const isUnread = item.readAt === null;
  const otherApp = item.app !== currentApp;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex w-full cursor-pointer items-start gap-3 px-[18px] py-[14px] text-left hover:bg-accent/6"
    >
      <span
        aria-hidden="true"
        className={
          isUnread
            ? "mt-[7px] size-2 flex-none rounded-full bg-accent"
            : "mt-[7px] size-2 flex-none rounded-full bg-transparent"
        }
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={
              isUnread
                ? "min-w-0 flex-1 truncate text-[15.5px] font-semibold text-ink"
                : "min-w-0 flex-1 truncate text-[15.5px] text-n300"
            }
          >
            {item.title}
          </span>
          <span className="flex-none text-[12.5px] text-n500">{formatDt(item.createdAt)}</span>
        </span>
        {item.body && (
          <span
            className={
              isUnread
                ? "mt-[2px] block text-[14px] leading-[1.6] text-n300"
                : "mt-[2px] block text-[14px] leading-[1.6] text-n500"
            }
          >
            {item.body}
          </span>
        )}
        <span className="mt-1 flex items-center gap-1.5 text-[12.5px] text-n500">
          {otherApp && (
            <span className="inline-flex flex-none items-center rounded-[6px] border border-line px-[5px] py-[1px] text-[11.5px] text-n400">
              {NOTIFICATION_APP_LABEL[item.app]} ↗
            </span>
          )}
          <span>
            {NOTIFICATION_TYPE_LABEL[item.type] ?? item.type}
            {isUnread ? " · 안 읽음" : ""}
          </span>
        </span>
      </span>
    </button>
  );
}
