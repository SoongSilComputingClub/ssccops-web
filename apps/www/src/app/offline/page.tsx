import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/shared/config/routes";
import { Card } from "@/shared/ui";
import { RetryButton } from "./retry-button";

/*
 * `/offline` — 연결이 없고 캐시에도 없는 화면을 열었을 때 서비스워커가 대신 내주는 안내
 * (#607 · ssccops#449 · ADR-0045 · admin #604와 같은 자리).
 *
 * **정적이고 데이터가 없다.** 워커가 install 때 이 HTML을 미리 담고, 오프라인 이동이 캐시에 없을 때
 * 꺼낸다 — 세션·API를 읽으면 담을 때의 사람이 굳는다. 루트 레이아웃(상단 바·푸터)은 세션도 API도
 * 보지 않으므로 그대로 두른다(`AuthNav`는 브라우저에서 로컬 세션만 읽는다) — 404 화면과 같은 틀이다.
 *
 * 색인하지 않는다 — 워커가 대신 내주는 화면이라 주소로 찾아올 뜻이 없다.
 */
export const metadata: Metadata = {
  title: "오프라인",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <Card className="flex flex-col items-center gap-[10px] px-[18px] py-[52px] text-center">
      <div className="text-[18px] font-medium">연결이 없습니다</div>
      <p className="max-w-[360px] text-[14px] leading-[1.6] text-n500">
        한 번 열었던 화면은 오프라인에서도 열립니다. 이 화면은 아직 연 적이 없어 보여 줄 내용이
        없습니다.
      </p>
      <div className="mt-[6px] flex flex-wrap items-center justify-center gap-[8px]">
        <RetryButton />
        <Link
          href={ROUTES.home}
          className="rounded-xl border border-line px-[16px] py-[10px] text-[14.5px] text-n300 hover:text-ink"
        >
          홈으로
        </Link>
      </div>
    </Card>
  );
}
