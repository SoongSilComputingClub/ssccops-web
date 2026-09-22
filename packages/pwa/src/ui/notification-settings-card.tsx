"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, SectionLabel, Toggle } from "@ssccops/ui";
import type { PushTestRequest, PushTestResult } from "../notification";
import { pushStateDescription } from "../push-copy";
import { useInstallPrompt } from "../use-install-prompt";
import {
  usePushSubscription,
  type PushSubscriptionState,
  type UsePushSubscriptionOptions,
} from "../use-push-subscription";
import { PushTestButton } from "./push-test-button";

/*
 * «알림 설정» 카드 — 푸시 스위치 + 상태 문장 + 켜졌을 때 «테스트 알림 보내기» (ssccops#461 · ssccops-web#634).
 *
 * admin `/my`(#604)·lms `/my`(#606)·www `/me`(#616)가 각자 `features/pwa`에 같은 카드(`PushToggleCard` +
 * `usePushToggle`)를 사본으로 갖고 있었다 — 코드가 같고 다른 것은 `app`과 `apiFetch`뿐이었다. #634에서
 * `/notifications` 맨 위에도 같은 카드를 두게 되어 네 자리가 되었으므로 여기 한 벌로 올렸다. 앱은
 * 서버 호출 다섯 개(`usePushSubscription`의 셋 + `sendTest`)만 꽂는다(`InstallMenuItem`·`PushTestButton`과
 * 같은 자리 — 앱마다 인증 헤더·봉투 처리가 다른 `apiFetch`를 갖고 있어 패키지가 서버를 직접 부르지 않는다).
 *
 * `onStateChange`는 `/notifications`의 «설정» 절이 **펼칠지 접을지**를 정하는 데 쓴다(`useNotificationSettingsDisclosure`)
 * — 상태 기계는 이 카드 안에 있으므로 카드가 접힌 채(`hidden`)로도 마운트돼 있어야 상태를 알 수 있다.
 * 페이지가 훅을 따로 한 번 더 부르면 스위치 둘이 서로 다른 상태를 들고 갈린다.
 */
export interface NotificationSettingsApi extends UsePushSubscriptionOptions {
  /** `POST /v1/notifications/test` — 앱의 `apiFetch`로 */
  sendTest: (request: PushTestRequest) => Promise<PushTestResult>;
}

export function NotificationSettingsCard({
  app,
  getConfig,
  subscribe,
  unsubscribe,
  sendTest,
  onStateChange,
}: Readonly<
  NotificationSettingsApi & {
    /** 스위치 상태가 정해지거나 바뀔 때 — `pending`도 온다 */
    onStateChange?: (state: PushSubscriptionState) => void;
  }
>) {
  const push = usePushSubscription({ app, getConfig, subscribe, unsubscribe });
  const { isIos, isStandalone } = useInstallPrompt();

  useEffect(() => {
    onStateChange?.(push.state);
  }, [push.state, onStateChange]);

  const on = push.state === "on";
  // `unsupported`·`denied`·`pending`은 잠근다 — 화면에서 되돌릴 수 없는 상태다(이유는 스위치 아래 문장)
  const interactive = push.state === "on" || push.state === "off";
  const description = pushStateDescription(push.state, { isIos, isStandalone });

  return (
    <Card>
      <div className="flex items-center">
        <SectionLabel>푸시 알림</SectionLabel>
        <div className="flex-1" />
        <Toggle
          on={on}
          onChange={() => void (on ? push.disable() : push.enable())}
          label="푸시 알림"
          disabled={!interactive}
          title={interactive ? undefined : description}
        />
      </div>
      <p className="mt-3 text-[13.5px] leading-[1.7] text-n500">{description}</p>
      {push.error && (
        <div className="mt-3 rounded-[10px] border border-danger/28 bg-danger/8 px-3 py-[10px] text-[14px] leading-[1.6] text-danger">
          {push.error}
        </div>
      )}
      <PushTestButton app={app} sendTest={sendTest} enabled={on} />
    </Card>
  );
}

/**
 * `/notifications`의 «설정» 절을 펼칠지 — 규칙은 푸시 상태다 (ssccops#461).
 *
 * 스위치가 `off`·`denied`·`unsupported`면 **펼친 채**, `on`이면 접힌 채로 시작한다 — «설정이 있는 줄
 * 모른다»는 문제의 답이 이 조건이라 localStorage에 기억하지 않는다. 처음 정해진 뒤에는 사람이 누른 대로만
 * 바뀐다 — 절 안에서 스위치를 켰다고 절이 스스로 접히면 «테스트 알림 보내기»가 눈앞에서 사라진다.
 * 상태를 아직 모르는 동안(`pending` · SSR과 첫 렌더)은 접혀 있다 — 켜 둔 사람에게 카드가 떴다 사라지는
 * 것보다 안 켠 사람에게 카드가 나타나는 쪽이 낫다.
 */
export function useNotificationSettingsDisclosure(): {
  open: boolean;
  /** 헤더의 ⚙ «설정» */
  toggle: () => void;
  /** 빈 상태의 «설정 열기» */
  show: () => void;
  /** 스위치가 켜져 있는가 — 빈 상태의 «푸시를 켜면…» 한 줄을 켜진 사람에게는 그리지 않는다 */
  pushOn: boolean;
  /** 카드의 `onStateChange`에 넘긴다 */
  onPushStateChange: (state: PushSubscriptionState) => void;
} {
  const [open, setOpen] = useState<boolean | null>(null);
  const [pushState, setPushState] = useState<PushSubscriptionState>("pending");

  const onPushStateChange = useCallback((state: PushSubscriptionState) => {
    setPushState(state);
    if (state === "pending") return;
    setOpen((current) => current ?? state !== "on");
  }, []);

  return {
    open: open === true,
    toggle: () => setOpen((current) => !(current ?? false)),
    show: () => setOpen(true),
    pushOn: pushState === "on",
    onPushStateChange,
  };
}

/** `aria-controls`로 잇는 절의 id — 버튼과 절이 같은 글자를 쓴다 */
export const NOTIFICATION_SETTINGS_SECTION_ID = "notification-settings";

/** 페이지 헤더 오른쪽의 ⚙ «설정» — «알림 설정» 절을 펼치고 접는다 */
export function NotificationSettingsButton({
  open,
  onClick,
}: Readonly<{ open: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={NOTIFICATION_SETTINGS_SECTION_ID}
      className={
        open
          ? "flex h-8 flex-none cursor-pointer items-center gap-[6px] rounded-[12px] border border-accent px-[10px] text-[13.5px] text-accent"
          : "flex h-8 flex-none cursor-pointer items-center gap-[6px] rounded-[12px] border border-line px-[10px] text-[13.5px] text-n300 hover:border-accent hover:text-accent"
      }
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
      설정
    </button>
  );
}
