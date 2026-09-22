"use client";

import {
  NOTIFICATION_SETTINGS_SECTION_ID,
  NotificationList,
  NotificationSettingsButton,
  useNotificationSettingsDisclosure,
} from "@ssccops/pwa/ui";
import { useNotifications } from "@/features/notification";
import { NotificationSettings } from "@/features/pwa";
import { PageBody, PageHeader } from "@/shared/ui";

/*
 * `/notifications` — 내 알림 목록 (#604 · ssccops#447) + 맨 위 «알림 설정» 절 (#634 · ssccops#461).
 *
 * 목록 UI는 `@ssccops/pwa/ui`의 `NotificationList`다 — lms(#448)가 같은 것을 그린다. 이 화면은 훅
 * (`useNotifications`)과 그 컴포넌트를 잇는 것이 전부다. 진입 경로는 종 아이콘뿐이고 사이드바 목차에는
 * 없다 — 목차는 «할 수 있는 일»이고 알림은 그 일로 가는 문이다.
 *
 * «알림 설정» 절은 헤더 오른쪽 ⚙ «설정»으로 펼치고 접는다. 스위치가 꺼져 있으면(`off`·`denied`·
 * `unsupported`) **펼친 채로** 시작한다 — 푸시 스위치가 `/my`에만 있어 알림 화면을 보는 사람이 설정이
 * 있는 줄 몰랐다(ssccops#461). 규칙은 `useNotificationSettingsDisclosure`(localStorage 없음 — 상태가 규칙).
 * 카드는 접혀 있어도 마운트돼 있다(`hidden`) — 상태 기계가 카드 안에 있어 접힌 채로도 상태를 알아야 한다.
 *
 * 목록 머리의 «이 앱 | 전체» 칩과 다른 앱 행의 꼬리표도 그 컴포넌트가 그린다(#643 · ADR-0047) — 이
 * 화면은 훅의 `scope`·`changeScope`와 `currentApp`을 잇기만 한다.
 */
export function NotificationListPage() {
  const list = useNotifications();
  const settings = useNotificationSettingsDisclosure();
  return (
    <>
      <PageHeader
        title="알림"
        subtitle="승인 요청·결과·마감"
        right={<NotificationSettingsButton open={settings.open} onClick={settings.toggle} />}
      />
      <PageBody maxWidth={720}>
        <section
          id={NOTIFICATION_SETTINGS_SECTION_ID}
          aria-label="알림 설정"
          hidden={!settings.open}
          className="mb-5"
        >
          <NotificationSettings onStateChange={settings.onPushStateChange} />
        </section>
        <NotificationList
          items={list.items}
          currentApp={list.currentApp}
          scope={list.scope}
          onScopeChange={list.changeScope}
          status={list.status}
          errorMessage={list.errorMessage || undefined}
          hasNext={list.hasNext}
          loadingMore={list.loadingMore}
          onLoadMore={() => void list.loadMore()}
          onOpen={(item) => void list.open(item)}
          onReadAll={() => void list.readAll()}
          readingAll={list.readingAll}
          onOpenSettings={settings.pushOn ? undefined : settings.show}
        />
      </PageBody>
    </>
  );
}
