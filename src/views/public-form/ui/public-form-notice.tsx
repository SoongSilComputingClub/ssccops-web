"use client";

import type { ReactNode } from "react";

/*
 * 응답자에게 보여 주는 전체 화면 안내.
 *
 * 접수 불가·이미 제출·없는 폼·조회 실패가 모두 이 모양을 쓴다. 네 경우 모두 **문항이 한 글자도
 * 그려지면 안 되는** 상태라, 작성 화면과 같은 컴포넌트 안에서 조건부로 섞지 않고 아예 다른
 * 화면으로 갈라 둔다 — 섞어 두면 분기 하나가 빠지는 것만으로 DRAFT 폼의 문항이 링크로 새어
 * 나간다(서버가 409로 끊는 것과 같은 이유다).
 *
 * 여기에는 **관리자 화면으로 가는 링크를 두지 않는다.** 지원자를 운영 화면으로 보낼 이유가
 * 없고, 보낸다 해도 그쪽은 어차피 권한에서 막힌다.
 */
export function PublicFormNotice({
  icon,
  tone = "neutral",
  title,
  description,
  action,
}: {
  icon: string;
  tone?: "neutral" | "success";
  title: string;
  description?: ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-10">
      <div className="w-full max-w-[520px] rounded-2xl bg-surface p-8 text-center shadow-[0_0_0_1px_#e5e8eb]">
        <div
          className={
            tone === "success"
              ? "mx-auto flex size-[52px] items-center justify-center rounded-full bg-success text-[24px] text-white"
              : "mx-auto flex size-[52px] items-center justify-center rounded-full bg-line text-[24px] text-n400"
          }
        >
          {icon}
        </div>
        <div className="mt-4 text-[22px] font-bold">{title}</div>
        {description && (
          <div className="mt-2 text-[14.5px] leading-[1.6] text-n400">{description}</div>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-6 w-full cursor-pointer rounded-[14px] border border-accent bg-accent py-3 text-[15px] font-semibold text-white hover:bg-accent-strong"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
