"use client";

import { NotificationList } from "@ssccops/pwa/ui";
import { useNotifications } from "@/features/notification";
import { PageBody, PageHeader } from "@/shared/ui";

/*
 * `/notifications` — 내 알림 목록 (#604 · ssccops#447).
 *
 * 목록 UI는 `@ssccops/pwa/ui`의 `NotificationList`다 — lms(#448)가 같은 것을 그린다. 이 화면은 훅
 * (`useNotifications`)과 그 컴포넌트를 잇는 것이 전부다. 진입 경로는 종 아이콘뿐이고 사이드바 목차에는
 * 없다 — 목차는 «할 수 있는 일»이고 알림은 그 일로 가는 문이다.
 */
export function NotificationListPage() {
  const list = useNotifications();
  return (
    <>
      <PageHeader title="알림" subtitle="승인 요청·결과·마감" />
      <PageBody maxWidth={720}>
        <NotificationList
          items={list.items}
          status={list.status}
          errorMessage={list.errorMessage || undefined}
          hasNext={list.hasNext}
          loadingMore={list.loadingMore}
          onLoadMore={() => void list.loadMore()}
          onOpen={(item) => void list.open(item)}
          onReadAll={() => void list.readAll()}
          readingAll={list.readingAll}
        />
      </PageBody>
    </>
  );
}
