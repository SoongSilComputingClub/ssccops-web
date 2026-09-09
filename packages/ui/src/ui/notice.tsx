import type { ReactNode } from "react";
import { Card } from "./card";

/*
 * 안내 카드 — 제목 · 설명 · (있으면) 다음 행동 (ssccops-web#329).
 *
 * www·lms에 **글자까지 같은 사본**이 있었다. `#243`이 UI를 올릴 때 "이번 범위는 상위 이슈가
 * 지목한 것까지"라며 남겨 둔 마지막 하나다.
 *
 * 목록이 비었을 때 쓰는 `EmptyState`와 모양을 맞추되 **행동을 붙일 수 있는 자리**를 둔 것이
 * 다르다. 로그인·가입처럼 사용자가 할 일이 남은 안내는 문구만 남겨 두면 읽고 나서 갈 곳이 없다.
 *
 * **`EmptyState`는 여전히 올리지 않는다** — admin은 `message`+`action`, www·lms는
 * `title`+`description`으로 API가 달라 합치면 한쪽 화면이 바뀐다(`card.tsx` 주석 참고).
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
