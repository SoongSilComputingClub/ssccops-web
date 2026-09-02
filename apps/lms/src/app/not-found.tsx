import Link from "next/link";
import { ROUTES } from "@/shared/config/routes";
import { Card } from "@/shared/ui";

/**
 * 404 — 없는 주소가 도착한다.
 *
 * 이 앱은 전 화면이 로그인 필수라, 로그인 유도는 각 화면의 공용 게이트가 그린다(#169). 여기는
 * 순수하게 "그런 주소가 없다"만 말하고 학술 대시보드로 돌아갈 길을 준다.
 */
export default function NotFound() {
  return (
    <Card className="flex flex-col items-center gap-[10px] px-[18px] py-[52px] text-center">
      <div className="text-[18px] font-medium">페이지를 찾을 수 없습니다</div>
      <p className="text-[14px] leading-[1.6] text-n500">
        주소가 바뀌었거나 삭제된 페이지입니다 — 학술 대시보드에서 다시 찾아 주세요
      </p>
      <Link
        href={ROUTES.studio}
        className="mt-[6px] rounded-xl bg-accent px-[16px] py-[10px] text-[14.5px] font-semibold text-white"
      >
        학술 대시보드로
      </Link>
    </Card>
  );
}
