import type { ReactNode } from "react";
import { Card } from "@/shared/ui";

/**
 * 안내 카드 — 제목 · 설명 · (있으면) 다음 행동.
 *
 * 목록이 비었을 때 쓰는 `EmptyState`와 모양을 맞추되 **행동을 붙일 수 있는 자리**를 둔 것이
 * 다르다. 로그인·가입처럼 사용자가 할 일이 남은 안내는 문구만 남겨 두면 읽고 나서 갈 곳이 없다.
 */
export function Notice({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-[10px] px-[18px] py-[46px] text-center">
      <div className="text-[15px] text-n300">{title}</div>
      {description && (
        <p className="max-w-[420px] text-[13.5px] leading-[1.7] text-n500">{description}</p>
      )}
      {children}
    </Card>
  );
}
