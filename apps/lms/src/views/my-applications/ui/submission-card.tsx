import Link from "next/link";
import { RSPNS_STTS_BADGE, type MyFormResponse } from "@/entities/response";
import { Badge } from "@/shared/ui";
import { formatDt } from "@/shared/lib/date";
import { myApplicationDetailUrl } from "@/shared/config/routes";

/*
 * 기획안 한 건 (#171).
 *
 * ── 순번과 회차를 한 자리에 섞지 않는다 ────────────────────────
 * 순번(`rspnsSeq`)은 몇 번째로 낸 건인가이고 회차(`sbmsnSeq`)는 그 한 건을 몇 번 냈는가다.
 * 섞으면 "2회차"가 두 번째 기획안인지 첫 기획안의 재제출인지 갈린다. 회차는 재제출한 건에만
 * 적는다 — 1회차는 모든 응답이 지나온 자리라 적을 것이 없다.
 *
 * ── 카드 전체가 상세로 가는 링크다 ────────────────────────────
 * 작성 중(DRAFT)인 건은 아직 낸 적이 없어 검토 이력도 재제출도 없다 — 상세에서 보여 줄 것이
 * "낸 내용"뿐이라 링크는 두되, 수정요청받은 건처럼 눈에 띄게 표시하지는 않는다.
 */
export function SubmissionCard({ response }: { response: MyFormResponse }) {
  const badge = RSPNS_STTS_BADGE[response.rspnsSttsCd];
  const isChangesRequested = response.rspnsSttsCd === "CHANGES_REQUESTED";
  const isRejected = response.rspnsSttsCd === "REJECTED";

  return (
    <Link
      href={myApplicationDetailUrl(response.formRspnsId)}
      className="flex flex-col gap-[8px] rounded-2xl bg-surface p-[16px] shadow-[0_0_0_1px_#e5e8eb] transition-shadow hover:shadow-[0_0_0_1px_#3182f6] lg:p-[18px]"
    >
      <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
        <span className="text-[15px] font-semibold">
          {response.rspnsSeq === null
            ? "기획안"
            : `${response.rspnsSeq}번째 기획안`}
        </span>
        <Badge tone={badge.tone}>{badge.label}</Badge>
        {response.sbmsnSeq !== null && response.sbmsnSeq >= 2 && (
          <span className="text-[13px] text-n500">{response.sbmsnSeq}회차 제출</span>
        )}
        <div className="flex-1" />
        {/* 아직 내지 않은 건은 제출 일시가 없다 — 대신 마지막 저장 시각을 말한다 */}
        <span className="text-[13px] text-n500">
          {response.sbmsnDt
            ? formatDt(response.sbmsnDt)
            : response.mdfcnDt
              ? `${formatDt(response.mdfcnDt)} 저장`
              : "제출 전"}
        </span>
      </div>

      {isChangesRequested && (
        <p className="text-[13.5px] leading-[1.6] text-amber">
          학술국장이 수정을 요청했습니다 — 사유를 확인하고 다시 제출할 수 있습니다
        </p>
      )}
      {isRejected && (
        <p className="text-[13.5px] leading-[1.6] text-n300">
          반려된 기획안입니다 — 사유는 상세에서 확인할 수 있습니다
        </p>
      )}
    </Link>
  );
}
