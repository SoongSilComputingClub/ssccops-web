import type { Metadata } from "next";
import { Card } from "@/shared/ui";
import { RetryButton } from "./retry-button";

/*
 * `/offline` — 연결이 없고 캐시에도 없는 화면을 열었을 때 서비스워커가 대신 내주는 안내 (#606 · ADR-0045).
 *
 * **정적이고 데이터가 없다.** 워커가 install 때 이 HTML을 미리 담고, 오프라인 이동이 캐시에 없을 때
 * 꺼낸다 — 세션·API를 읽으면 담을 때의 사람이 굳는다. 미들웨어 매처에서 뺀 것도 같은 이유다.
 *
 * 루트 레이아웃의 상단 바 안에 그려진다 — 어드민과 달리 이 앱의 셸은 세션 조회(`fetchIsAcademicLeader`)를
 * 실패하면 `false`로 삼키므로 오프라인에서도 셸 자체는 선다. 담긴 HTML의 상단 바는 «담을 때의 역할»
 * 목차이지만 이 화면에서 누를 것은 «다시 시도» 하나라 상관없다. 모양은 `not-found.tsx`와 같다.
 */
export const metadata: Metadata = { title: "오프라인" };

export default function OfflinePage() {
  return (
    <Card className="flex flex-col items-center gap-[10px] px-[18px] py-[52px] text-center">
      <div className="text-[18px] font-medium">연결이 없습니다</div>
      <p className="max-w-[360px] text-[14px] leading-[1.7] text-n500">
        마지막으로 열었던 화면은 오프라인에서도 열립니다. 이 화면은 아직 연 적이 없어 보여 줄
        내용이 없습니다.
      </p>
      <RetryButton />
    </Card>
  );
}
