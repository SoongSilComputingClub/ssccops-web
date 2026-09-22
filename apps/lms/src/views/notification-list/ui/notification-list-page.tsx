"use client";

import {
  NOTIFICATION_SETTINGS_SECTION_ID,
  NotificationList,
  NotificationSettingsButton,
  useNotificationSettingsDisclosure,
} from "@ssccops/pwa/ui";
import { LoginGate } from "@/features/auth";
import { useNotifications } from "@/features/notification";
import { NotificationSettings } from "@/features/pwa";
import { SignupRequiredNotice } from "@/features/signup";

/*
 * `/notifications` — 내 알림 목록 (#606 · ssccops#448) + 맨 위 «알림 설정» 절 (#634 · ssccops#461).
 *
 * 목록 UI는 `@ssccops/pwa/ui`의 `NotificationList`다 — 어드민 `/notifications`(#604)가 같은 것을 그린다
 * («알림 목록 뷰를 두 앱이 공유» · ssccops#448). 이 화면은 훅(`useNotifications`)과 그 컴포넌트를 잇는
 * 것이 전부다. 진입 경로는 상단 바의 종뿐이고 목차(`nav-links.ts`)에는 없다 — 목차는 «할 수 있는 일»이고
 * 알림은 그 일로 가는 문이다.
 *
 * **클라이언트 화면이다** — 이 앱의 다른 조회와 달리 SSR 로더가 아니다. 읽음 처리·«더 보기»가 브라우저
 * 상태이고, 종 배지(`@ssccops/pwa` 스토어)와 같은 값을 그 자리에서 맞춰야 한다. 미로그인·미가입은 훅이
 * 상태로 올리고 여기서 다른 화면과 같은 게이트·안내를 그린다.
 *
 * 목록 머리의 «이 앱 | 전체» 칩과 다른 앱 행의 꼬리표는 그 컴포넌트가 그린다(#643 · ADR-0047) — 이
 * 화면은 훅의 `scope`·`changeScope`와 `currentApp`을 잇기만 한다.
 *
 * «알림 설정» 절은 헤더 오른쪽 ⚙ «설정»으로 펼치고 접는다. 스위치가 꺼져 있으면(`off`·`denied`·
 * `unsupported`) **펼친 채로** 시작한다(ssccops#461 — 설정이 있는 줄 몰랐다). 규칙은
 * `useNotificationSettingsDisclosure`(localStorage 없음 — 상태가 규칙). 카드는 접혀 있어도 마운트돼
 * 있다(`hidden`) — 상태 기계가 카드 안에 있다. 로그인 게이트·가입 안내가 보일 때는 절도 버튼도 없다 —
 * 스위치를 켜 봐야 그 계정으로 오는 알림이 없다.
 */
export function NotificationListPage() {
  const list = useNotifications();
  const settings = useNotificationSettingsDisclosure();
  const gated = list.status === "unauthenticated" || list.status === "signup-required";

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex items-start gap-[12px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">알림</h1>
          <p className="text-[13.5px] text-n500">승인 요청·결과·마감</p>
        </div>
        {!gated && <NotificationSettingsButton open={settings.open} onClick={settings.toggle} />}
      </header>
      {!gated && (
        <section id={NOTIFICATION_SETTINGS_SECTION_ID} aria-label="알림 설정" hidden={!settings.open}>
          <NotificationSettings onStateChange={settings.onPushStateChange} />
        </section>
      )}
      <Body list={list} onOpenSettings={settings.pushOn ? undefined : settings.show} />
    </div>
  );
}

function Body({
  list,
  onOpenSettings,
}: Readonly<{ list: ReturnType<typeof useNotifications>; onOpenSettings?: () => void }>) {
  if (list.status === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="알림은 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해주세요"
      />
    );
  }
  if (list.status === "signup-required") {
    return <SignupRequiredNotice title="회원 가입을 마쳐야 알림을 볼 수 있습니다" />;
  }
  return (
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
        status={list.status}
        errorMessage={list.errorMessage || undefined}
        hasNext={list.hasNext}
        loadingMore={list.loadingMore}
        onLoadMore={() => void list.loadMore()}
        onOpen={(item) => void list.open(item)}
        onReadAll={() => void list.readAll()}
        readingAll={list.readingAll}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
}
