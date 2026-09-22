"use client";

import { PushTestButton } from "@ssccops/pwa/ui";
import { SectionLabel, Toggle } from "@ssccops/ui";
import { notificationApi } from "@/entities/notification";
import { Card } from "@/shared/ui";
import { usePushToggle } from "../model/use-push-toggle";

/**
 * `/me`의 «푸시 알림» 카드 — 스위치 + 상태 문장 (#616 · admin #604·lms #606과 같은 모양) + 켜져 있을 때만
 * «테스트 알림 보내기»(ssccops#454 — 버튼·문구는 `@ssccops/pwa/ui`, 서버 호출만 이 앱의 것).
 *
 * 허브(SSR)의 발치에 놓이는 유일한 클라이언트 구역이다 — 스위치는 «이 기기의 설정»이라 서버가 그릴 수
 * 없고(브라우저 권한·구독), 토큰은 부모가 이미 봤으므로 로그인한 사람에게만 그려진다.
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
      <PushTestButton app="WWW" sendTest={notificationApi.sendTest} enabled={push.on} />
    </Card>
  );
}
