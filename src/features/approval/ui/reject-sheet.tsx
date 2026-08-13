"use client";

import { useState } from "react";
import { Sheet, TextField, flash } from "@/shared/ui";

/** 반려 사유 입력 시트 — 사유는 필수 */
export function RejectSheet({
  open,
  onClose,
  onReject,
}: {
  open: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
}) {
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
      hint="반려 사유를 입력하세요 (필수)"
      onClose={close}
      onOk={() => {
        if (!reason.trim()) {
          flash("반려 사유를 입력해야 합니다");
          return;
        }
        onReject(reason.trim());
        close();
      }}
      okLabel="반려"
    >
      <TextField
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="예: 예산 초과"
        autoFocus
      />
    </Sheet>
  );
}
