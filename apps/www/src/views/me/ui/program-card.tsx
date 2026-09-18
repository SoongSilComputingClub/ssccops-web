import { acdmActvSttsBadge, type AcademicProgramSummary } from "@/entities/academic-program";
import { lmsOrigin, lmsProgramDetailPath } from "@/shared/config/lms-routes";
import { formatEventPeriod } from "@/shared/lib/date";
import { Badge, Pill } from "@/shared/ui";

/**
 * 내가 이끄는 활동 한 건 — 상태 배지 · 유형 · 제목 · 기간 · 진행률, 그리고 lms로 가는 링크 (#518).
 *
 * ── 여기서는 요약만 그린다 ──────────────────────────────────
 * 회차 기록·출석·팀원은 lms `/studio/programs/{id}`의 일이고(ssccops#386 — 학술은 lms, 요약은
 * www `/me`), 이 카드는 «지금 내가 맡은 활동이 무엇이고 어디까지 왔는가»까지만 답한다. 카드
 * 전체가 그 화면으로 가는 링크다.
 *
 * ── 링크가 없는 경우 ───────────────────────────────────────
 * lms 오리진(`NEXT_PUBLIC_LMS_ORIGIN`)이 비어 있으면 `href`를 만들 수 없다 — 그때는 링크 없이
 * 카드만 선다(공유 착지 `/s/{token}`이 같은 상황에서 내린 판단과 같다 · 죽은 주소로 사람을
 * 던지지 않는다). 남의 앱 주소는 `shared/config/lms-routes.ts` 한 곳에서만 조립한다.
 *
 * 유형(`typeCd`)은 코드 그대로 보인다 — 목록 응답에 표시명이 없고(lms도 같은 값을 그대로
 * 그린다), 화면이 코드 → 이름 표를 지어내면 서버 시드와 갈린다.
 */
export function ProgramCard({ program }: Readonly<{ program: AcademicProgramSummary }>) {
  const status = acdmActvSttsBadge(program.sttsCd);
  const period = formatEventPeriod(program.eventBeginAt, program.eventEndAt);
  const origin = lmsOrigin();
  const href = origin ? `${origin}${lmsProgramDetailPath(program.academicProgramId)}` : null;
  const ratio = Math.round(program.progressRatio);

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-[6px]">
        {status && <Badge tone={status.tone}>{status.label}</Badge>}
        <Pill tone="outline">{program.typeCd}</Pill>
      </div>

      <div className="text-[17px] leading-[1.35] font-semibold lg:text-[18px]">
        {program.title || "-"}
      </div>

      {period && <div className="text-[13.5px] text-n500">{period}</div>}

      <div className="flex items-center gap-[8px] text-[13px] text-n500">
        <div
          className="h-[6px] flex-1 overflow-hidden rounded-full bg-bg"
          role="progressbar"
          aria-label="진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={ratio}
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${ratio}%` }} />
        </div>
        <span className="whitespace-nowrap">진행률 {ratio}%</span>
      </div>
    </>
  );

  const className =
    "flex flex-col gap-[8px] rounded-2xl bg-surface p-[16px] shadow-[0_0_0_1px_#e5e8eb] lg:p-[18px]";

  if (!href) return <div className={className}>{body}</div>;

  return (
    <a
      href={href}
      className={`${className} transition-shadow hover:shadow-[0_0_0_1px_#1b64da]`}
    >
      {body}
    </a>
  );
}
