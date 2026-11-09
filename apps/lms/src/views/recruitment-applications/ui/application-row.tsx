import Link from "next/link";
import { selectionBadge } from "@/entities/academic-program";
import type { RecruitmentApplication } from "@/entities/form";
import { RSPNS_STTS_BADGE } from "@/entities/response";
import { studioProgramApplicationUrl } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import { Badge } from "@/shared/ui";

/*
 * 지원서 한 줄 (#826 · ssccops#625).
 *
 * 데스크톱(lg 이상)은 표의 한 행, lg 미만은 카드다 — 이 앱의 반응형 경계는 `lg` 하나다(팀원 명단
 * `member-row.tsx`와 같은 모양). 줄을 여는 것은 링크(`<a>`)다 — 클릭만 되는 `tr`·`div`를 만들지
 * 않는다. 데스크톱은 이름과 끝의 «보기»가, 모바일은 카드 전체가 링크다.
 *
 * 빈 값은 «-»로 그린다 — 이 자리(뷰)가 표시 규칙을 정한다. 변환기는 빈 이름을 빈 문자열로 둔다.
 */

/** «2번째 지원» — 반려 뒤 다시 낸 지원서를 첫 지원과 가른다. 첫 지원·모르는 배포는 그리지 않는다 */
function seqText(rspnsSeq: number | null): string | null {
  return rspnsSeq !== null && rspnsSeq >= 2 ? `${rspnsSeq}번째 지원` : null;
}

function nameOf(app: RecruitmentApplication): string {
  return app.applicant.memberName || "-";
}

export function ApplicationRowDesktop({
  academicProgramId,
  app,
}: Readonly<{ academicProgramId: number; app: RecruitmentApplication }>) {
  const href = studioProgramApplicationUrl(academicProgramId, app.formRspnsId);
  const status = RSPNS_STTS_BADGE[app.rspnsSttsCd];
  const selection = selectionBadge(app.ptcpSttsCd);
  const seq = seqText(app.rspnsSeq);

  return (
    <tr className="border-t border-line">
      <td className="px-[12px] py-[13px]">
        <Link href={href} className="text-[14.5px] font-medium text-ink hover:text-accent">
          {nameOf(app)}
        </Link>
        {seq && <div className="mt-[2px] text-[12.5px] text-n500">{seq}</div>}
      </td>
      <td className="px-[12px] py-[13px] text-[14px] text-n400">{app.applicant.studentNo || "-"}</td>
      <td className="px-[12px] py-[13px] text-[14px] text-n400">
        {app.applicant.subjectName || "-"}
      </td>
      <td className="px-[12px] py-[13px] text-[14px] text-n400">
        {app.sbmsnDt ? formatDt(app.sbmsnDt) : "-"}
      </td>
      <td className="px-[12px] py-[13px]">
        <Badge tone={status.tone}>{status.label}</Badge>
      </td>
      <td className="px-[12px] py-[13px]">
        <Badge tone={selection.tone}>{selection.label}</Badge>
      </td>
      <td className="px-[12px] py-[13px] text-right">
        <Link
          href={href}
          aria-label={`${nameOf(app)} 지원서 보기`}
          className="text-[14px] text-n300 hover:text-accent"
        >
          보기 ›
        </Link>
      </td>
    </tr>
  );
}

export function ApplicationCardMobile({
  academicProgramId,
  app,
}: Readonly<{ academicProgramId: number; app: RecruitmentApplication }>) {
  const status = RSPNS_STTS_BADGE[app.rspnsSttsCd];
  const selection = selectionBadge(app.ptcpSttsCd);
  const seq = seqText(app.rspnsSeq);
  const meta = [app.applicant.studentNo, app.applicant.subjectName].filter(Boolean).join(" · ");

  return (
    <Link
      href={studioProgramApplicationUrl(academicProgramId, app.formRspnsId)}
      className="flex flex-col gap-[8px] border-t border-line px-[4px] py-[14px] first:border-t-0 hover:bg-bg"
    >
      <div className="flex items-center justify-between gap-[8px]">
        <span className="text-[15px] font-medium text-ink">{nameOf(app)}</span>
        <span className="flex shrink-0 gap-[6px]">
          <Badge tone={status.tone}>{status.label}</Badge>
          <Badge tone={selection.tone}>{selection.label}</Badge>
        </span>
      </div>
      {meta && <div className="text-[13px] text-n500">{meta}</div>}
      <div className="text-[13px] text-n500">
        {app.sbmsnDt ? `제출 ${formatDt(app.sbmsnDt)}` : "제출 일시 없음"}
        {seq ? ` · ${seq}` : ""}
      </div>
    </Link>
  );
}
