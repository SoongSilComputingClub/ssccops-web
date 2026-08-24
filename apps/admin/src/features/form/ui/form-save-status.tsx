"use client";

import { cn } from "@/shared/lib/cn";
import type { FormSaveStatus } from "../model/use-form-editor";

/*
 * 자동 저장 상태 표시줄.
 *
 * **화면 어딘가에 항상 보여야 한다.** 자동 저장은 사용자가 아무 버튼도 누르지 않는데 값이
 * 서버로 나가는 구조라, 지금 저장됐는지 보류됐는지 실패했는지를 볼 곳이 없으면 사용자는
 * "저장된 줄 알았는데 사라졌다"를 겪고 나서야 알게 된다. 토스트로 대신하지 않는 것도 같은
 * 이유다 — 2초 뒤 사라지는 문구는 나중에 다시 확인할 수 없다.
 *
 * 특히 '보류(blocked)'는 조용히 넘어가면 안 된다. 제목이 비어 있다는 이유로 저장이 멈춘 채로
 * 30분을 편집하는 상황이 실제로 가능하다.
 */

const TONE: Record<FormSaveStatus["state"], string> = {
  clean: "border-line bg-surface text-n500",
  pending: "border-line bg-surface text-n500",
  saving: "border-line bg-surface text-n400",
  saved: "border-line bg-surface text-n400",
  blocked: "border-amber/35 bg-amber-soft text-amber",
  failed: "border-danger/35 bg-danger/10 text-danger",
};

function statusText(save: FormSaveStatus): string {
  switch (save.state) {
    case "saving":
      return "저장 중…";
    case "saved":
      return `마지막 저장 ${save.savedAt}`;
    case "pending":
      return save.savedAt ? `변경됨 · 마지막 저장 ${save.savedAt}` : "변경됨 · 곧 저장됩니다";
    case "blocked":
      return `저장 보류 — ${save.message}`;
    case "failed":
      return save.retrying
        ? `저장 실패, 재시도 중 — ${save.message}`
        : `저장 실패 — ${save.message}`;
    case "clean":
      return "변경 사항이 자동으로 저장됩니다";
  }
}

export function FormSaveStatusBar({
  save,
  onRetry,
}: {
  save: FormSaveStatus;
  onRetry: () => void;
}) {
  return (
    <div
      // 저장 상태는 포커스를 뺏지 않고 알려야 한다 — 스크린리더는 polite 로 읽는다
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-[12px] border px-3 py-[10px] text-[13.5px]",
        TONE[save.state],
      )}
    >
      <span
        className={cn(
          "size-[7px] flex-none rounded-full",
          save.state === "saving" && "animate-pulse bg-accent",
          save.state === "saved" && "bg-accent",
          save.state === "pending" && "bg-n400",
          save.state === "clean" && "bg-line-strong",
          save.state === "blocked" && "bg-amber",
          save.state === "failed" && "bg-danger",
        )}
      />
      <span className="min-w-0 flex-1">{statusText(save)}</span>
      {save.state === "failed" && (
        <button
          type="button"
          onClick={onRetry}
          className="flex-none cursor-pointer whitespace-nowrap underline underline-offset-2"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
