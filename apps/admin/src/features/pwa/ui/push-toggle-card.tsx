"use client";

import { Card, SectionLabel, Toggle } from "@/shared/ui";
import { usePushToggle } from "../model/use-push-toggle";

/** `/my`의 «푸시 알림» 카드 — 스위치 + 상태 문장 (#604) */
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
    </Card>
  );
}
