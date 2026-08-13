"use client";

import type { ReactNode } from "react";
import { Button } from "./button";

/** 중앙 모달 시트 — 등급/상태/역할 변경, 반려 사유 입력 등 */
export function Sheet({
  open,
  title,
  hint,
  onClose,
  onOk,
  okLabel = "확인",
  children,
}: {
  open: boolean;
  title: string;
  hint?: string;
  onClose: () => void;
  onOk?: () => void;
  okLabel?: string;
  children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-[90] animate-fade-in bg-black/55"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 z-[91] max-h-[78%] w-[440px] -translate-x-1/2 -translate-y-1/2 animate-pop-in overflow-y-auto rounded-2xl bg-surface p-[22px] shadow-[0_0_0_1px_#8b95a1,0_16px_40px_rgba(0,0,0,.56)]">
        <div className="text-[20px] font-medium">{title}</div>
        {hint && <div className="mt-[5px] mb-[18px] text-[14px] text-n500">{hint}</div>}
        {children}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          {onOk && <Button onClick={onOk}>{okLabel}</Button>}
        </div>
      </div>
    </>
  );
}
