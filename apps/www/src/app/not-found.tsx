import Link from "next/link";
import { ROUTES } from "@/shared/config/routes";
import { Card } from "@/shared/ui";

/**
 * 404 — 없는 주소와 **아직 공개하지 않은 행사·포스트**가 함께 도착한다.
 *
 * 둘을 문구로 가르지 않는 것은, 가르는 순간 게시 전 글의 존재가 주소만으로 새어 나가기
 * 때문이다. 행사만 있던 때는 «공개된 행사가 아닙니다»였는데 포스트 상세(#520)가 같은 화면을
 * 쓰게 되어 «없는 주소»로 넓혔다. 페이지(소개·연혁 등)는 여기 오지 않는다 — 게시본이 없으면
 * «준비 중»이다.
 */
export default function NotFound() {
  return (
    <Card className="flex flex-col items-center gap-[10px] px-[18px] py-[52px] text-center">
      <div className="text-[18px] font-medium">없는 주소입니다</div>
      <p className="text-[14px] leading-[1.6] text-n500">홈이나 기록에서 다시 찾아주세요.</p>
      <div className="mt-[6px] flex flex-wrap items-center justify-center gap-[8px]">
        <Link
          href={ROUTES.home}
          className="rounded-xl bg-accent px-[16px] py-[10px] text-[14.5px] font-semibold text-on-solid"
        >
          홈으로
        </Link>
        <Link
          href={ROUTES.records}
          className="rounded-xl border border-line px-[16px] py-[10px] text-[14.5px] text-n300 hover:text-ink"
        >
          기록 보기
        </Link>
      </div>
    </Card>
  );
}
