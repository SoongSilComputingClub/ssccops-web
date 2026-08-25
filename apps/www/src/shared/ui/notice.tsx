import type { ReactNode } from "react";
import { Card } from "@/shared/ui";

/**
 * 안내 카드 — 제목 · 설명 · (있으면) 다음 행동.
 *
 * 목록이 비었을 때 쓰는 `EmptyState`와 모양을 맞추되 **행동을 붙일 수 있는 자리**를 둔 것이
 * 다르다. 로그인·가입처럼 사용자가 할 일이 남은 안내는 문구만 남겨 두면 읽고 나서 갈 곳이 없다.
 *
 * '내 신청'의 로그인 안내에서 시작했지만 신청 흐름(#154)도 같은 자리를 쓴다 — 두 화면이 하는
 * 말이 같아서다(로그인해야 볼 수 있다 · 가입해야 낼 수 있다). 뷰끼리는 서로를 참조하지 않으므로
 * 공용 자리인 `shared/ui`로 옮겼다.
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
