import Link from "next/link";
import { ROUTES } from "@/shared/config/routes";
import { Card } from "@/shared/ui";

/**
 * 404 — 없는 주소와 **아직 공개하지 않은 행사**가 함께 도착한다.
 *
 * 둘을 문구로 가르지 않는 것은, 가르는 순간 게시 전 행사의 존재가 주소만으로 새어 나가기
 * 때문이다. "공개된 행사가 아닙니다"라고만 쓰고 목록으로 돌아갈 길을 준다.
 */
export default function NotFound() {
  return (
    <Card className="flex flex-col items-center gap-[10px] px-[18px] py-[52px] text-center">
      <div className="text-[18px] font-medium">공개된 행사가 아닙니다</div>
      <p className="text-[14px] leading-[1.6] text-n500">
        주소가 바뀌었거나 아직 공개되지 않은 행사입니다 — 행사 목록에서 다시 찾아 주세요
      </p>
      <Link
        href={ROUTES.events}
        className="mt-[6px] rounded-xl bg-accent px-[16px] py-[10px] text-[14.5px] font-semibold text-white"
      >
        행사 목록으로
      </Link>
    </Card>
  );
}
