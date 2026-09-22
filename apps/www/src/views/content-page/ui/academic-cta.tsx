import { LMS_HOME_PATH, LMS_PROPOSAL_NEW_PATH, lmsOrigin } from "@/shared/config/lms-routes";
import { Card } from "@/shared/ui";

/**
 * 학술 페이지 아래 CTA (#550 · ssccops#412) — «LMS로 가기»와 «기획안 제출하기».
 *
 * 주소가 배포 설정(`NEXT_PUBLIC_LMS_ORIGIN`)에서 오는 값이라 코드가 붙인다 — 글 안에 적게 하면
 * 환경마다 갈린다(#641에서 설명 글 자체를 걷어 화면이 통째로 코드가 됐다). 설정이 없으면 블록을
 * 그리지 않는다(없는 주소로 보내지 않는다 — `/me`의 학술 카드와 같은 판단).
 *
 * 둘 다 로그인이 필요한 화면이지만 여기서 세션을 보지 않는다 — 로그인은 LMS가 자기 자리에서
 * 시작한다(홈이 세션을 보지 않는 것과 같은 이유 · 익명 캐시).
 */
export function AcademicCta() {
  const origin = lmsOrigin();
  if (!origin) return null;
  return (
    <Card className="flex flex-col gap-[12px] px-[18px] py-[18px] lg:px-[26px] lg:py-[22px]">
      <div>
        <h2 className="text-[19px] font-semibold tracking-[-.2px]">참여하기</h2>
        <p className="mt-[4px] text-[14.5px] text-n400">
          학술 프로그램 신청, 기획안 제출, 회차·출석은 LMS에서 합니다. 로그인은 그쪽에서 합니다.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-[8px]">
        <a
          href={`${origin}${LMS_HOME_PATH}`}
          className="rounded-xl bg-accent px-[18px] py-[11px] text-[15px] font-semibold text-on-solid transition-colors hover:bg-accent-strong"
        >
          LMS로 가기
        </a>
        <a
          href={`${origin}${LMS_PROPOSAL_NEW_PATH}`}
          className="rounded-xl border border-line px-[18px] py-[11px] text-[15px] text-n300 hover:text-ink"
        >
          기획안 제출하기
        </a>
      </div>
    </Card>
  );
}
