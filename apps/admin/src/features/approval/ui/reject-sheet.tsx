"use client";

import { useState } from "react";
import { Sheet, TextField, flash } from "@/shared/ui";

/**
 * 반려 사유 입력 시트 — 사유는 필수.
 *
 * `maxLength`는 **서버 계약을 아는 호출부가 넘긴다** (하위 업무 반려는 500자 · OPS-010).
 * 기본값을 두지 않는 것은 여기서 고른 숫자가 서버와 조용히 갈리기 때문이다 — 아직 목
 * 데이터를 쓰는 화면(승인함·대시보드)은 넘기지 않는다.
 */
export function RejectSheet({
  open,
  onClose,
  onReject,
  maxLength,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
  maxLength?: number;
}>) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  const close = () => {
    setReason("");
    onClose();
  };

  return (
    <Sheet
      open
      title="반려"
      hint="반려 사유(필수)"
      onClose={close}
      onOk={() => {
        if (!reason.trim()) {
          flash("반려 사유를 입력해주세요");
          return;
        }
        onReject(reason.trim());
        close();
      }}
      okLabel="반려"
    >
      {/* 시트의 `hint`는 `<label>`이 아니라 이름이 되지 못한다 — 같은 문구를 한 줄 더 세우지 않고 이름만 붙인다 (#486) */}
      <TextField
        aria-label="반려 사유"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="예: 예산 초과"
        maxLength={maxLength}
        autoFocus
      />
    </Sheet>
  );
}
