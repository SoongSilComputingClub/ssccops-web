"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  NotificationPageHeader,
  NotificationScreen,
  NotificationSettingsButton,
  useNotificationSettingsDisclosure,
} from "@ssccops/pwa/ui";
import { SignInButton } from "@/features/auth";
import { useNotifications, type NotificationListStatus } from "@/features/notification";
import { NotificationSettings } from "@/features/pwa";
import { ROUTES } from "@/shared/config/routes";
import { Notice } from "@/shared/ui";

/*
 * `/notifications` — 내 알림 목록 (#616 · ssccops#453 · ADR-0045) + 맨 위 «알림 설정» 절 (#634 · ssccops#461).
 *
 * 머리·설정 절·목록은 `@ssccops/pwa/ui`의 `NotificationPageHeader`·`NotificationScreen`이다(#671) —
 * admin `/notifications`(#604)·lms(#606)가 같은 것을 그린다. 이 화면에 남은 것은 이 앱의 설명 한 줄과
 * **로그인·가입 안내**뿐이다. 진입 경로는 상단 바의 종뿐이고 목차(`nav-links.ts`)에는 없다.
 *
 * **클라이언트 화면이다** — 이 앱의 다른 화면과 달리 SSR이 아니다(AGENTS.md «규칙»의 예외 — 브라우저에서
 * 저장·제출하는 화면). 읽음 처리·«더 보기»가 브라우저 상태이고, 종 배지(`@ssccops/pwa` 스토어)와 같은
 * 값을 그 자리에서 맞춰야 한다. 미로그인·미가입은 훅이 상태로 올리고 여기서 안내를 그린다 — 리다이렉트
 * 없음(이 앱의 규약). 가입은 `/me`의 자리(`InlineSignup` · #451)라 그리로 보낸다.
 *
 * 목록 머리의 «이 앱 | 전체» 칩과 다른 앱 행의 꼬리표는 그 컴포넌트가 그린다(#643 · ADR-0047).
 *
 * «알림 설정» 절은 헤더 오른쪽 ⚙ «설정»으로 펼치고 접는다. 스위치가 꺼져 있으면(`off`·`denied`·
 * `unsupported`) **펼친 채로** 시작한다(ssccops#461 — 스위치가 `/me` 발치에만 있어 있는 줄 몰랐다). 규칙은
 * `useNotificationSettingsDisclosure`(localStorage 없음 — 상태가 규칙). 카드는 접혀 있어도 마운트돼
 * 있다(`hidden`) — 상태 기계가 카드 안에 있다. 로그인·가입 안내가 보일 때는 절도 버튼도 없다.
 */
export function NotificationListPage() {
  const list = useNotifications();
  const settings = useNotificationSettingsDisclosure();
  const gate = notificationGate(list.status);

  return (
    <div className="flex flex-col gap-[16px]">
      <NotificationPageHeader
        description="낸 폼과 기획안의 검토 결과, 행사 참가 상태"
        action={
          gate ? undefined : (
            <NotificationSettingsButton open={settings.open} onClick={settings.toggle} />
          )
        }
      />
      <NotificationScreen list={list} settings={settings} gate={gate}>
        <NotificationSettings onStateChange={settings.onPushStateChange} />
      </NotificationScreen>
    </div>
  );
}

/** 목록 대신 그릴 안내 — 밀어낼 로그인 화면이 없어 같은 자리에서 그린다 */
function notificationGate(status: NotificationListStatus): ReactNode {
  if (status === "unauthenticated") {
    return (
      <Notice
        title="로그인하면 알림을 볼 수 있습니다"
        description="알림은 본인만 볼 수 있어 로그인이 필요합니다."
      >
        <SignInButton next={ROUTES.notifications} label="구글로 로그인" />
      </Notice>
    );
  }
  if (status === "signup-required") {
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
  return null;
}
