"use client";

import type { ApplySaveStatus } from "../model/use-apply-form";

/*
 * 자동 저장 표시줄.
 *
 * **항상 보인다.** 버튼을 누르지 않았는데 값이 서버로 나가는 구조라, 저장됐는지 실패했는지 볼
 * 곳이 없으면 "저장된 줄 알았는데 사라졌다"를 겪고 나서야 알게 된다.
 *
 * 실패했을 때 다시 시도할 여지가 남았는지까지 말하는 것은, 그렇지 않으면 신청자가 무엇을
 * 기다려야 하는지 알 수 없기 때문이다 — 자동으로 다시 보내는 중이면 기다리면 되고, 다 썼으면
 * 손으로 눌러야 한다.
 */
export function SaveStatusBar({
  save,
  onRetry,
}: {
  save: ApplySaveStatus;
  onRetry: () => void;
}) {
  if (save.state === "clean") return null;

  if (save.state === "failed") {
    return (
      <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px] rounded-[12px] bg-surface px-[13px] py-[9px] text-[12.5px] shadow-[0_0_0_1px_#f04452]">
        <span className="text-danger">{save.message}</span>
        {save.retrying ? (
          <span className="text-n500">다시 시도하는 중입니다</span>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer rounded-[8px] px-[8px] py-[3px] text-accent hover:bg-accent-soft"
          >
            지금 다시 저장
          </button>
        )}
      </div>
    );
  }

  const label =
    save.state === "saving"
      ? "저장하는 중…"
      : save.state === "pending"
        ? "곧 자동으로 저장됩니다"
        : `${save.savedAt}에 자동 저장됨`;

  return (
    <div className="rounded-[12px] bg-surface px-[13px] py-[9px] text-[12.5px] text-n500 shadow-[0_0_0_1px_#e5e8eb]">
      {label}
    </div>
  );
}
