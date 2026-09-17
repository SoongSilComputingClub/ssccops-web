"use client";

import { Button } from "@/shared/ui";
import type { ConsentDecision } from "../model/use-oauth-consent";

/*
 * 허용·거절 두 버튼 (ssccops#315).
 *
 * 둘 다 한 번에 하나만 진행되고, 진행 중에는 둘 다 잠근다 — 거절을 누른 직후 허용을 눌러
 * 두 요청이 겹치면 Supabase가 먼저 처리한 쪽이 이기고 화면은 어느 쪽으로 돌아갔는지 모른다.
 *
 * «허용»이 오른쪽·주색인 것은 로그인 화면의 «Google로 계속하기»와 같은 자리다. «거절»은
 * 위험 색이 아니다 — 거절은 되돌릴 수 없는 파괴가 아니라 연결을 시작한 앱으로 돌아가는 것이고,
 * 다시 시도하면 된다.
 */
export function ConsentDecisionButtons({
  pending,
  onApprove,
  onDeny,
}: Readonly<{
  pending: ConsentDecision | null;
  onApprove: () => void;
  onDeny: () => void;
}>) {
  const busy = pending !== null;
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="ghost" onClick={onDeny} disabled={busy}>
        {pending === "deny" ? "거절하는 중…" : "거절"}
      </Button>
      <Button onClick={onApprove} disabled={busy}>
        {pending === "approve" ? "허용하는 중…" : "허용"}
      </Button>
    </div>
  );
}
