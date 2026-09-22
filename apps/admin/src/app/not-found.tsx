import Link from "next/link";
import { Card } from "@/shared/ui";
import { ROUTES } from "@/shared/config/routes";

/*
 * 404 — 없는 주소가 도착한다 (#635 · ssccops#462).
 *
 * 루트 `not-found`라 `(admin)` 셸(사이드바·AuthGate) 밖에서 그려진다 — 로그인 전에도 올 수 있는 자리다.
 * 그래서 목차 대신 «전체 메뉴»로 보낸다: 주소를 잘못 친 사람이 찾던 화면은 대개 거기 있고, 권한이 없어
 * 사이드바에서 감춰진 화면이면 거기서 잠금과 필요한 권한이 보인다. 대시보드 링크는 «일단 돌아갈 곳».
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <Card className="flex w-full max-w-[420px] flex-col items-center gap-[10px] px-[18px] py-[52px] text-center">
        <div className="text-[18px] font-medium">없는 주소입니다</div>
        <p className="text-[14px] leading-[1.6] text-n500">전체 메뉴에서 다시 찾아주세요.</p>
        <div className="mt-[6px] flex flex-wrap items-center justify-center gap-[8px]">
          <Link
            href={ROUTES.sitemap}
            className="rounded-xl bg-accent px-[16px] py-[10px] text-[14.5px] font-semibold text-on-solid outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            전체 메뉴
          </Link>
          <Link
            href={ROUTES.dashboard}
            className="rounded-xl border border-line px-[16px] py-[10px] text-[14.5px] text-n300 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            대시보드로
          </Link>
        </div>
      </Card>
    </div>
  );
}
