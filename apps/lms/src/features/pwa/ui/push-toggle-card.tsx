"use client";

import { PushTestButton } from "@ssccops/pwa/ui";
import { SectionLabel } from "@ssccops/ui";
import { notificationApi } from "@/entities/notification";
import { Card, Toggle } from "@/shared/ui";
import { usePushToggle } from "../model/use-push-toggle";

/**
 * `/my`의 «푸시 알림» 카드 — 스위치 + 상태 문장 (#606 · 어드민 #604와 같은 모양) + 켜져 있을 때만
 * «테스트 알림 보내기»(ssccops#454 · #616 — 버튼·문구는 `@ssccops/pwa/ui`, 서버 호출만 이 앱의 것).
 */
export function PushToggleCard() {
  const push = usePushToggle();
  return (
    <Card>
      <div className="flex items-center">
        <SectionLabel>푸시 알림</SectionLabel>
        <div className="flex-1" />
        <Toggle
          on={push.on}
          onChange={() => void push.toggle()}
          label="푸시 알림"
          disabled={!push.interactive}
          title={push.interactive ? undefined : push.description}
        />
      </div>
      <p className="mt-3 text-[13.5px] leading-[1.7] text-n500">{push.description}</p>
      {push.error && (
        <div className="mt-3 rounded-[10px] border border-danger/28 bg-danger/8 px-3 py-[10px] text-[14px] leading-[1.6] text-danger">
          {push.error}
        </div>
      )}
      <PushTestButton app="LMS" sendTest={notificationApi.sendTest} enabled={push.on} />
    </Card>
  );
}
