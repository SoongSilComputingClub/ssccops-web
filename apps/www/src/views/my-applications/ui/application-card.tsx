import Link from "next/link";
import { applicationStatusBadge, type MyApplication } from "@/entities/application";
import { ROUTES } from "@/shared/config/routes";
import { formatEventPeriod } from "@/shared/lib/date";
import { Badge, Pill } from "@/shared/ui";

/**
 * 신청 한 건 — 상태 배지 · 행사 제목 · 분류 · 일시 · 장소.
 *
 * 상태를 **맨 위에** 두는 것은 이 화면에 오는 이유가 그것 하나이기 때문이다(D10 — 능동 통보가
 * 없으므로 여기서만 결과를 안다). 카드 전체가 행사 상세로 가는 링크라, 결과를 본 뒤 곧바로
 * 무슨 행사였는지 다시 확인할 수 있다.
 *
 * 일시·장소는 없으면 그 자리를 통째로 비운다 — "미정" 같은 문구를 만들어 넣으면 서버가 준
 * 값과 구별할 수 없다.
 */
export function ApplicationCard({ application }: { application: MyApplication }) {
  const status = applicationStatusBadge(application.applicationStatus);
  const period = formatEventPeriod(application.eventBgngDt, application.eventEndDt);

  return (
    <Link
      href={ROUTES.eventDetail(application.eventId)}
      className="flex flex-col gap-[8px] rounded-2xl bg-surface p-[16px] shadow-[0_0_0_1px_#e5e8eb] transition-shadow hover:shadow-[0_0_0_1px_#1b64da] lg:p-[18px]"
    >
      <div className="flex items-center gap-[6px]">
        <Badge tone={status.tone}>{status.label}</Badge>
        <Pill>{application.eventClsfNm}</Pill>
      </div>

      <div className="text-[17px] font-semibold leading-[1.35] lg:text-[18px]">
        {application.eventTtl}
      </div>

      {(period || application.plcNm) && (
        <div className="flex flex-col gap-[2px] text-[13.5px] text-n500">
          {period && <span>{period}</span>}
          {application.plcNm && <span>{application.plcNm}</span>}
        </div>
      )}

      <p className="text-[13.5px] leading-[1.6] text-n300">{status.note}</p>
    </Link>
  );
}
