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
  okDisabled,
  okTitle,
  children,
}: {
  open: boolean;
  title: string;
  hint?: string;
  onClose: () => void;
  onOk?: () => void;
  okLabel?: string;
  /**
   * 확인 버튼을 잠근다 — 감추지 않고 잠근 채 이유를 `okTitle`로 붙인다 (PageHeader와 같은 판단).
   *
   * 서버가 어차피 거절할 입력(등급·상태 시트에서 현재와 같은 값 · 미래 적용 일자)을 왕복 없이
   * 그 자리에서 막는 데 쓴다. 버튼 자체를 없애면 왜 저장이 안 되는지가 화면에서 사라진다.
   */
  okDisabled?: boolean;
  okTitle?: string;
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
          {onOk && (
            <Button onClick={onOk} disabled={okDisabled} title={okTitle}>
              {okLabel}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
