import Link from "next/link";
import { ROUTES } from "@/shared/config/routes";
import { Notice } from "@/shared/ui";

/**
 * 제출 완료.
 *
 * **결과를 언제 어떻게 받는지 약속하지 않는다**(wave2 D10 — 능동 통보는 범위 밖이다). 알림이
 * 가지 않는데 "결과를 안내드립니다"라고 쓰면 신청자는 오지 않을 연락을 기다린다. 대신 결과를
 * 볼 수 있는 곳('내 신청')을 그 자리에서 내준다.
 *
 * 대기 순번도 말하지 않는다(D5 — 비공개). 서버가 순번을 주지도 않지만, 없는 값을 짐작해 쓰면
 * 그것대로 약속이 된다.
 */
export function ApplyDone({ eventId }: { eventId: number }) {
  return (
    <Notice
      title="신청이 접수되었습니다"
      description="진행 상황은 '내 신청'에서 확인할 수 있습니다. 선발·확정 결과도 같은 화면에 표시됩니다."
    >
      <div className="flex flex-wrap items-center justify-center gap-[8px]">
        <Link
          href={ROUTES.myApplications}
          className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          내 신청 보기
        </Link>
        <Link
          href={ROUTES.eventDetail(eventId)}
          className="rounded-xl px-[14px] py-[12px] text-[14.5px] text-n300 hover:text-ink"
        >
          행사 안내로
        </Link>
      </div>
    </Notice>
  );
}
