"use client";

import Link from "next/link";
import {
  NOTIFICATION_SETTINGS_SECTION_ID,
  NotificationList,
  NotificationSettingsButton,
  useNotificationSettingsDisclosure,
} from "@ssccops/pwa/ui";
import { SignInButton } from "@/features/auth";
import { useNotifications } from "@/features/notification";
import { NotificationSettings } from "@/features/pwa";
import { ROUTES } from "@/shared/config/routes";
import { Notice } from "@/shared/ui";

/*
 * `/notifications` — 내 알림 목록 (#616 · ssccops#453 · ADR-0045) + 맨 위 «알림 설정» 절 (#634 · ssccops#461).
 *
 * 목록 UI는 `@ssccops/pwa/ui`의 `NotificationList`다 — admin `/notifications`(#604)·lms(#606)가 같은 것을
 * 그린다. 이 화면은 훅(`useNotifications`)과 그 컴포넌트를 잇는 것이 전부다. 진입 경로는 상단 바의
 * 종뿐이고 목차(`nav-links.ts`)에는 없다.
 *
 * **클라이언트 화면이다** — 이 앱의 다른 화면과 달리 SSR이 아니다(AGENTS.md «규칙»의 예외 — 브라우저에서
 * 저장·제출하는 화면). 읽음 처리·«더 보기»가 브라우저 상태이고, 종 배지(`@ssccops/pwa` 스토어)와 같은
 * 값을 그 자리에서 맞춰야 한다. 미로그인·미가입은 훅이 상태로 올리고 여기서 안내를 그린다 — 리다이렉트
 * 없음(이 앱의 규약). 가입은 `/me`의 자리(`InlineSignup` · #451)라 그리로 보낸다.
 *
 * 목록 머리의 «이 앱 | 전체» 칩과 다른 앱 행의 꼬리표는 그 컴포넌트가 그린다(#643 · ADR-0047) — 이
 * 화면은 훅의 `scope`·`changeScope`와 `currentApp`을 잇기만 한다.
 *
 * «알림 설정» 절은 헤더 오른쪽 ⚙ «설정»으로 펼치고 접는다. 스위치가 꺼져 있으면(`off`·`denied`·
 * `unsupported`) **펼친 채로** 시작한다(ssccops#461 — 스위치가 `/me` 발치에만 있어 있는 줄 몰랐다). 규칙은
 * `useNotificationSettingsDisclosure`(localStorage 없음 — 상태가 규칙). 카드는 접혀 있어도 마운트돼
 * 있다(`hidden`) — 상태 기계가 카드 안에 있다. 로그인·가입 안내가 보일 때는 절도 버튼도 없다.
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
          <p className="text-[13.5px] text-n500">낸 폼과 기획안의 검토 결과, 행사 참가 상태</p>
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
      <Notice
        title="로그인하면 알림을 볼 수 있습니다"
        description="알림은 본인만 볼 수 있어 로그인이 필요합니다."
      >
        <SignInButton next={ROUTES.notifications} label="구글로 로그인" />
      </Notice>
    );
  }
  if (list.status === "signup-required") {
    return (
      <Notice
        title="회원 가입을 마쳐야 알림을 볼 수 있습니다"
        description="가입은 내 활동 화면에서 합니다."
      >
        <Link
          href={ROUTES.me}
          className="inline-block rounded-xl bg-accent px-[16px] py-[10px] text-[14.5px] font-semibold text-on-solid hover:bg-accent-strong"
        >
          내 활동으로 가기
        </Link>
      </Notice>
    );
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
