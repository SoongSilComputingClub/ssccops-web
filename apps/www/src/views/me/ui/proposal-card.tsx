import { RESPONSE_STATUS_BADGE, type MyFormResponseOverview } from "@/entities/form";
import { lmsMyApplicationPath, lmsOrigin } from "@/shared/config/lms-routes";
import { formatDt } from "@/shared/lib/date";
import { Badge, Pill } from "@/shared/ui";

/**
 * 낸 기획안 한 건 — 상태 배지 · 활동명 · 제출 일시 · 수정요청 사유, 그리고 lms로 가는 링크 (#574).
 *
 * ── 왜 `FormResponseCard`가 아닌가 ────────────────────────────
 * 그 카드는 **www의 응답 상세**(`/f/{ref}/responses/{id}`)로 간다. 기획안은 lms가 주인이다 —
 * 재제출·수정 요청 대응·검토 이력이 lms `/my/applications/{formRspnsId}`에 있고, www의 응답
 * 상세는 아무 폼이나 그리는 일반 화면이라 기획안을 열면 반쪽만 보인다(`/f/{key}`가 #555에서
 * lms로 보내게 된 이유와 같다). 그래서 이 카드는 `ProgramCard`처럼 **남의 앱 주소**를 달고,
 * 오리진(`NEXT_PUBLIC_LMS_ORIGIN`)이 비어 있으면 링크 없이 카드만 선다 — 죽은 주소로 사람을
 * 던지지 않는다. 주소 조립은 `shared/config/lms-routes.ts` 한 곳.
 *
 * ── 제목은 활동명이다 ────────────────────────────────────────
 * lms `SubmissionCard`(#204)와 같은 판단 — 대표 문항의 답(`responseTitle`)이 있으면 그것이
 * 제목이고 순번은 곁들인다. 없으면 «N번째 기획안», 순번도 없으면 «기획안»이다. 폼 제목은
 * 작은 줄로 남긴다.
 */
export function ProposalCard({
  response,
  reviewOpinion,
}: Readonly<{
  response: MyFormResponseOverview;
  /** 수정요청 사유 — 조회하지 못했거나 해당 없으면 null */
  reviewOpinion: string | null;
}>) {
  const status = RESPONSE_STATUS_BADGE[response.rspnsSttsCd];
  const changesRequested = response.rspnsSttsCd === "CHANGES_REQUESTED";
  const submittedAt = response.sbmsnDt ?? response.mdfcnDt;
  const origin = lmsOrigin();
  const href = origin ? `${origin}${lmsMyApplicationPath(response.formRspnsId)}` : null;

  const title =
    response.responseTitle ??
    (response.rspnsSeq === null ? "기획안" : `${response.rspnsSeq}번째 기획안`);

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-[6px]">
        <Badge tone={status.tone}>{status.label}</Badge>
        {response.labels.map((label) => (
          <Pill key={label.formLblId}>{label.lblNm}</Pill>
        ))}
      </div>

      <div className="flex flex-col gap-[2px]">
        <div className="flex flex-wrap items-baseline gap-x-[8px]">
          <span className="text-[17px] leading-[1.35] font-semibold lg:text-[18px]">{title}</span>
          {/* 활동명이 있을 때만 순번을 곁들인다 — 없으면 위 제목이 이미 순번을 말한다 */}
          {response.responseTitle !== null && response.rspnsSeq !== null && (
            <span className="text-[13px] text-n500">{response.rspnsSeq}번째</span>
          )}
        </div>
        {response.formTtlNm && (
          <span className="text-[14px] text-n300">{response.formTtlNm}</span>
        )}
      </div>

      {submittedAt && (
        <div className="text-[13.5px] text-n500">
          {response.sbmsnDt
            ? `제출 ${formatDt(response.sbmsnDt)}`
            : `저장 ${formatDt(response.mdfcnDt)}`}
          {response.sbmsnSeq !== null && response.sbmsnSeq > 1 && ` · ${response.sbmsnSeq}회차`}
        </div>
      )}

      {/* 사유는 여기서 읽힌다 — 다시 내는 것은 lms의 일이라 안내가 그쪽을 가리킨다 */}
      {changesRequested && (
        <div className="rounded-xl bg-amber-50 px-[12px] py-[10px] text-[13.5px] leading-[1.6] text-amber-900">
          {reviewOpinion ? (
            <>
              <span className="font-semibold">수정 요청</span>
              <p className="mt-[2px] whitespace-pre-line">{reviewOpinion}</p>
            </>
          ) : (
            <span>수정 요청을 받았습니다 — LMS에서 사유를 확인하고 다시 내주세요</span>
          )}
        </div>
      )}

      {href && (
        <span className="text-[13.5px] font-semibold text-accent-strong">LMS에서 보기</span>
      )}
    </>
  );

  const className =
    "flex flex-col gap-[8px] rounded-2xl bg-surface p-[16px] shadow-[0_0_0_1px_#e5e8eb] lg:p-[18px]";

  if (!href) return <div className={className}>{body}</div>;

  return (
    <a href={href} className={`${className} transition-shadow hover:shadow-[0_0_0_1px_#1b64da]`}>
      {body}
    </a>
  );
}
