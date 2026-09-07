import Link from "next/link";
import {
  RESPONSE_STATUS_BADGE,
  type MyFormResponseOverview,
} from "@/entities/form";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import { Badge, Pill } from "@/shared/ui";

/**
 * 폼 응답 한 건 — 상태 배지 · 폼 제목 · 라벨 · 제출 일시, 그리고 **수정요청이면 그 사유**.
 *
 * 상태를 맨 위에 두는 것은 `ApplicationCard`와 같은 이유다 — 이 화면에 오는 까닭이 그것 하나다.
 * 대신 배지는 **응답 상태**(`RESPONSE_STATUS_BADGE`)이지 참가 상태가 아니다. 두 축을 한 벌로
 * 합치지 않는 것이 이 화면의 규칙이며, 그래서 구역도 나뉘어 있다.
 *
 * **제목은 두 층이다.** 폼 제목이 "무엇에 답했는가"이고, 대표 문항의 답(`responseTitle`)이
 * 있으면 "그중 어느 것인가"를 말한다 — 같은 폼에 여러 건을 낸 사람에게는 후자가 실제 구별
 * 수단이다(서버 #196이 그 값을 만든 이유다). 없으면 그 줄을 아예 그리지 않는다.
 *
 * 순번은 대표 문항의 답이 없을 때만 쓴다. 둘 다 없으면 폼 제목만 남는데, 그것이 서버가 준
 * 사실 그대로다 — "제목 없음" 같은 문구를 지어내면 서버가 준 값과 구별할 수 없다.
 */
export function FormResponseCard({
  response,
  reviewOpinion,
}: {
  response: MyFormResponseOverview;
  /** 수정요청 사유 — 조회하지 못했거나 해당 없으면 null */
  reviewOpinion: string | null;
}) {
  const status = RESPONSE_STATUS_BADGE[response.rspnsSttsCd];
  const changesRequested = response.rspnsSttsCd === "CHANGES_REQUESTED";
  const submittedAt = response.sbmsnDt ?? response.mdfcnDt;

  return (
    <Link
      href={ROUTES.publicForm(response.formId)}
      className="flex flex-col gap-[8px] rounded-2xl bg-surface p-[16px] shadow-[0_0_0_1px_#e5e8eb] transition-shadow hover:shadow-[0_0_0_1px_#1b64da] lg:p-[18px]"
    >
      <div className="flex flex-wrap items-center gap-[6px]">
        <Badge tone={status.tone}>{status.label}</Badge>
        {response.labels.map((label) => (
          <Pill key={label.formLblId}>{label.lblNm}</Pill>
        ))}
      </div>

      <div className="flex flex-col gap-[2px]">
        <div className="text-[17px] leading-[1.35] font-semibold lg:text-[18px]">
          {response.formTtlNm}
        </div>
        {response.responseTitle ? (
          <span className="text-[14px] text-n300">{response.responseTitle}</span>
        ) : (
          response.rspnsSeq !== null &&
          response.rspnsSeq > 1 && (
            <span className="text-[14px] text-n300">{response.rspnsSeq}번째 응답</span>
          )
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

      {/*
       * 수정요청 사유는 이 카드 안에서 읽힌다. 사유를 보려고 폼을 다시 열어야 한다면 이 화면을
       * 만든 이유가 절반만 달성된다 — 링크를 잃어버린 사람이 정확히 이 기능이 필요한 사람이다.
       *
       * 조회에 실패해도 카드는 그대로 선다. 사유를 못 읽는 것과 수정요청을 받았다는 사실을
       * 모르는 것은 다른 일이라, 상태 배지만으로도 이 화면은 제 몫을 한다.
       */}
      {changesRequested && (
        <div className="rounded-xl bg-amber-50 px-[12px] py-[10px] text-[13.5px] leading-[1.6] text-amber-900">
          {reviewOpinion ? (
            <>
              <span className="font-semibold">수정 요청</span>
              <p className="mt-[2px] whitespace-pre-line">{reviewOpinion}</p>
            </>
          ) : (
            <span>수정 요청을 받았습니다 — 폼을 열어 사유를 확인해 주세요</span>
          )}
        </div>
      )}
    </Link>
  );
}
