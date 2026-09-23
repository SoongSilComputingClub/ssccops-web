"use client";

import type { ReactNode } from "react";
import type { NotificationListState } from "../use-notification-list";
import { NotificationList, type NotificationListStatus } from "./notification-list";
import {
  NOTIFICATION_SETTINGS_SECTION_ID,
  useNotificationSettingsDisclosure,
} from "./notification-settings-card";

/*
 * `/notifications` 화면의 몸통 — 세 앱이 같은 것을 그린다 (#671 · admin #604 · lms #606 · www #616).
 *
 * #634·#643 뒤 세 앱의 `notification-list-page.tsx`가 45·45·13줄씩 같았다 — «알림 설정» 절(`hidden`
 * 마운트 · ssccops#461)과 훅의 상태를 `NotificationList`에 잇는 배선(#665)이다. 갈리는 것은 셋뿐이라
 * 슬롯으로 받는다:
 * - **머리** — admin은 자기 `PageHeader`·`PageBody`를 쓰고 www·lms는 `NotificationPageHeader`를 쓴다.
 *   ⚙ «설정» 버튼(`NotificationSettingsButton`)은 앱이 자기 머리에 놓는다
 * - **`gate`** — 로그인 안내·가입 안내. www·lms만 있다(그 앱의 `apiFetch`가 401·403을 화면 상태로
 *   올린다 · `useGatedNotificationList`). 서 있으면 목록도 «알림 설정» 절도 그리지 않는다 — 스위치를
 *   켜 봐야 그 계정으로 오는 알림이 없다
 * - **설정 카드**(`children`) — 앱의 `features/pwa` `NotificationSettings`(배선만). 앱이
 *   `onStateChange={settings.onPushStateChange}`로 꽂아 넘긴다. 상태 기계가 카드 안에 있어 절이 접혀
 *   있어도 마운트돼 있어야 한다(`hidden`)
 *
 * 목록 머리의 «이 앱 | 전체» 칩과 다른 앱 행의 꼬리표는 `NotificationList`가 그린다(#643 · ADR-0047).
 * «모두 읽음» 실패 한 줄은 훅의 `actionError`다 — 토스트를 꽂은 앱(admin)에서는 언제나 빈 문자열이라
 * 그리지 않는다.
 */

/** `useNotificationSettingsDisclosure()`가 돌려주는 것 — 앱이 쥐고(머리의 버튼) 이 컴포넌트에 넘긴다 */
export type NotificationSettingsDisclosure = ReturnType<typeof useNotificationSettingsDisclosure>;

export function NotificationScreen<G extends string = never>({
  list,
  settings,
  children,
  gate,
  sectionClassName,
}: Readonly<{
  list: NotificationListState<G>;
  settings: NotificationSettingsDisclosure;
  /** «알림 설정» 카드 — 앱이 `onStateChange`를 꽂아 넘긴다 */
  children: ReactNode;
  /** 목록 대신 그릴 안내. 있으면 «알림 설정» 절도 그리지 않는다 */
  gate?: ReactNode;
  /** 절의 바깥 여백 — 부모가 `flex gap`이 아닌 앱(admin)이 넘긴다 */
  sectionClassName?: string;
}>) {
  /*
   * `gate`가 서 있으면 목록을 그리지 않으므로 여기 오는 상태는 `loading`·`ready`·`error` 셋뿐이다 —
   * 앱이 더한 게이트 상태(`G`)는 `gate`로 갈라져 나갔다. 타입으로는 그 사실을 보일 수 없어 한 번 좁힌다.
   */
  const status = list.status as NotificationListStatus;

  return (
    <>
      {!gate && (
        <section
          id={NOTIFICATION_SETTINGS_SECTION_ID}
          aria-label="알림 설정"
          hidden={!settings.open}
          className={sectionClassName}
        >
          {children}
        </section>
      )}
      {gate ?? (
        <div>
          {list.actionError && (
            <div className="mb-3 rounded-[10px] border border-danger/28 bg-danger/8 px-3 py-[10px] text-[14px] leading-[1.6] text-danger">
              {list.actionError}
            </div>
          )}
          <NotificationList
            items={list.items}
            currentApp={list.currentApp}
            scope={list.scope}
            onScopeChange={list.changeScope}
            status={status}
            errorMessage={list.errorMessage || undefined}
            hasNext={list.hasNext}
            loadingMore={list.loadingMore}
            onLoadMore={() => void list.loadMore()}
            onOpen={(item) => void list.open(item)}
            onReadAll={() => void list.readAll()}
            readingAll={list.readingAll}
            onOpenSettings={settings.pushOn ? undefined : settings.show}
          />
        </div>
      )}
    </>
  );
}

/**
 * `/notifications`의 머리 — 제목 «알림» + 한 줄 설명 + 오른쪽 자리 (www #616 · lms #606).
 *
 * 설명은 앱마다 다르다(회원이 받는 것과 운영진이 받는 것이 다르다). 오른쪽은 ⚙ «설정»
 * (`NotificationSettingsButton`)이고, 게이트가 서 있을 때는 앱이 넘기지 않는다. admin은 자기
 * `PageHeader`를 쓰므로 이것을 쓰지 않는다.
 */
export function NotificationPageHeader({
  description,
  action,
}: Readonly<{ description: string; action?: ReactNode }>) {
  return (
    <header className="flex items-start gap-[12px]">
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">알림</h1>
        <p className="text-[13.5px] text-n500">{description}</p>
      </div>
      {action}
    </header>
  );
}
