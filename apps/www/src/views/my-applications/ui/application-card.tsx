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
 *
 * ── 제출 내용으로 가는 길 (ssccops#278) ───────────────────────
 * 카드 본체는 행사 상세로 가지만, **내가 낸 답**은 거기에 없다. 행사 상세는 다시 '신청하기'를
 * 보여주고, 신청 화면은 "이미 신청하셨습니다 → 내 신청"으로 되돌려 보내 **고리**가 됐다 —
 * 어디에서도 자기가 무엇을 냈는지 볼 수 없었다. 폼 응답 카드(FormResponseCard)는 v0.2.3에서
 * 응답 상세로 가게 고쳤는데, 행사에 붙은 신청은 이 카드라 그 수정이 닿지 않았다.
 *
 * 그래서 카드 안에 응답 상세로 가는 **별도의 링크**를 둔다. 카드 전체를 응답 상세로 돌리지
 * 않는 것은 이 화면에 오는 이유(결과 확인 → 무슨 행사였는지)가 그대로이기 때문이다.
 * 카드 전체가 하나의 Link였는데 그 안에 Link를 더 넣으면 a 안의 a가 된다(HTML이 허용하지
 * 않고 브라우저가 멋대로 쪼갠다). 그래서 바깥을 div로 바꾸고 본체 링크와 응답 링크를 형제로 둔다.
 *
 * `formId`가 없는(옛 서버) 항목에는 링크를 그리지 않는다 — 주소를 만들 수 없다.
 */
export function ApplicationCard({ application }: { application: MyApplication }) {
  const status = applicationStatusBadge(application.applicationStatus);
  const period = formatEventPeriod(application.eventBgngDt, application.eventEndDt);

  const responseHref =
    application.formId !== null && application.formRspnsId !== null
      ? ROUTES.myFormResponse(application.formId, application.formRspnsId)
      : null;

  return (
    <div className="flex flex-col gap-[8px] rounded-2xl bg-surface p-[16px] shadow-[0_0_0_1px_#e5e8eb] transition-shadow hover:shadow-[0_0_0_1px_#1b64da] lg:p-[18px]">
      <Link href={ROUTES.eventDetail(application.eventId)} className="flex flex-col gap-[8px]">
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

      {responseHref && (
        <Link
          href={responseHref}
          className="self-start text-[13.5px] font-semibold text-accent-strong underline underline-offset-2"
        >
          제출 내용 보기
        </Link>
      )}
    </div>
  );
}
