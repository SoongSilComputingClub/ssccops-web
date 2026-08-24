"use client";

import { RSPNS_STTS_BADGE } from "@/entities/response";
import { useMyResponses } from "@/features/form";
import { formatDt } from "@/shared/lib/date";
import { Badge } from "@/shared/ui";

/*
 * 내가 이 폼에 낸 응답들 (ssccops-server #143 · GET .../responses/mine).
 *
 * **다중 응답 폼에서만 그린다.** 1건 폼에서는 제출을 마치는 순간 화면이 '이미 제출한 폼입니다'로
 * 갈리므로 여기 설 자리가 없고, 아직 안 낸 사람에게는 언제나 빈 상자다.
 *
 * 조회에 실패해도 **작성 화면은 그대로 둔다.** 지난 제출 내역을 못 받은 것과 답을 쓸 수 없는
 * 것은 다른 일이라, 이 상자 안에서만 사유를 말하고 다시 시도할 길을 준다.
 *
 * 순번(rspnsSeq)과 회차(sbmsnSeq)를 한 자리에 섞지 않는다 — 앞은 몇 번째로 낸 건인가이고
 * 뒤는 그 한 건을 몇 번 냈는가다. 회차는 재제출한 건에만 붙는다(1회차는 적을 것이 없다).
 */
export function MyResponsesPanel({ formId }: { formId: number }) {
  const { responses, status, errorMessage, reload } = useMyResponses(formId);

  return (
    <div className="rounded-2xl bg-surface px-[18px] py-4 shadow-[0_0_0_1px_#e5e8eb] lg:px-6">
      <div className="text-[15px] font-semibold">
        내가 낸 응답
        {status === "ready" && responses.length > 0 && (
          <span className="ml-[6px] text-[13.5px] font-normal text-n500">
            {responses.length}건
          </span>
        )}
      </div>
      {/* 1건 폼과 갈리는 이유를 여기서 밝힌다 — 그쪽은 제출 직후 화면 자체가 바뀐다 */}
      <div className="mt-[2px] text-[13px] leading-[1.6] text-n500">
        이 폼은 한 사람이 여러 건을 낼 수 있어, 제출한 뒤에도 작성 화면이 계속 열려 있습니다.
      </div>

      {status === "loading" && (
        <div className="mt-2 text-[13.5px] text-n500">불러오는 중입니다…</div>
      )}

      {status === "error" && (
        <div className="mt-2 text-[13.5px] text-n500">
          {errorMessage}
          <button
            type="button"
            onClick={reload}
            className="ml-[6px] cursor-pointer text-accent underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {status === "ready" && responses.length === 0 && (
        <div className="mt-2 text-[13.5px] text-n500">아직 낸 응답이 없습니다.</div>
      )}

      {status === "ready" && responses.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {responses.map((r) => {
            const badge = RSPNS_STTS_BADGE[r.rspnsSttsCd];
            return (
              <div
                key={r.formRspnsId}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-black/5 pt-2 first:border-none first:pt-0"
              >
                <span className="text-[14.5px]">
                  {r.rspnsSeq === null ? "응답" : `${r.rspnsSeq}번째 응답`}
                </span>
                <Badge tone={badge.tone}>{badge.label}</Badge>
                {/* 재제출한 건에만 회차를 적는다 — 1회차는 모든 응답이 지나온 자리다 */}
                {r.sbmsnSeq !== null && r.sbmsnSeq >= 2 && (
                  <span className="text-[13px] text-n500">{r.sbmsnSeq}회차 제출</span>
                )}
                <div className="flex-1" />
                {/* 아직 내지 않은 응답은 제출 일시가 없다 — 대신 마지막 저장 시각을 말한다 */}
                <span className="text-[13px] text-n500">
                  {r.sbmsnDt
                    ? formatDt(r.sbmsnDt)
                    : r.mdfcnDt
                      ? `${formatDt(r.mdfcnDt)} 저장`
                      : "제출 전"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
