"use client";

import {
  RVW_PRCS_SE_BADGE,
  type FormResponseReviewHistory,
} from "@/entities/response";
import { formatDt } from "@/shared/lib/date";
import { Badge, Card, EmptyState, SectionLabel } from "@/shared/ui";

/**
 * 처리 이력 타임라인 (ssccops-server #141).
 *
 * 그전까지 응답 상세에는 처리자도 시각도 나오지 않았다 — 서버가 남기지 않았기 때문이다.
 * 서버가 이력을 남기게 되었으니 화면이 그것을 보여 준다.
 *
 * ── 정렬도 합치기도 하지 않는다 ────────────────────────────────
 * 서버가 처리 일시 오름차순으로 내려준다. 화면이 다시 정렬하면 그 규칙이 두 벌이 되고,
 * 같은 시각의 두 줄이 화면마다 다른 차례로 보인다.
 *
 * ── 제출도 한 줄이다 ───────────────────────────────────────────
 * 검토만 쌓으면 "무엇에 대한 검토였는가"의 출발점이 사라진다. 재제출이 있으면 제출 줄이
 * 여러 번 나타나고 회차(`sbmsnSeq`)로 갈린다 — 회차를 함께 적는 이유가 그것이다.
 *
 * ── 없는 값을 메우지 않는다 ────────────────────────────────────
 * 검토 의견은 승인에서 선택이고 제출 줄에는 아예 없다. 빈 것이 정상이므로 "(없음)"처럼
 * 값이 있는 척하지 않고 그 줄에서 의견 자리를 통째로 뺀다.
 */
export function ResponseReviewTimeline({
  histories,
}: {
  histories: FormResponseReviewHistory[];
}) {
  return (
    <Card>
      <SectionLabel className="mb-1">처리 이력</SectionLabel>
      <div className="text-[13px] leading-[1.7] text-n500">
        제출과 검토 처리가 시간순으로 쌓입니다.
      </div>

      {histories.length === 0 ? (
        /*
         * 이력이 없는 것은 오류가 아니다 — #141 이전에 처리된 응답에는 남은 줄이 없다.
         * "아직 없다"와 "기록되지 않는다"를 구별해 적는다.
         */
        <EmptyState
          padding="sm"
          message="기록된 처리 이력이 없습니다. #141 이전에 처리된 응답은 이력이 남아 있지 않습니다."
        />
      ) : (
        <ol className="mt-4 flex flex-col gap-4">
          {histories.map((h) => {
            const badge = RVW_PRCS_SE_BADGE[h.rvwPrcsSeCd];
            return (
              <li
                key={h.formRspnsRvwHstryId}
                /* 375px에서는 세로로 쌓이고 lg 이상에서 배지와 본문이 나란히 선다 */
                className="flex flex-col gap-[6px] border-l-2 border-line pl-[14px] lg:flex-row lg:gap-3 lg:border-l-0 lg:pl-0"
              >
                <div className="lg:w-[92px] lg:shrink-0">
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] text-n500">
                    {/* 처리 일시 · 처리자 — 값이 없으면 없는 대로 '-'로 둔다(표시 규칙은 뷰의 몫) */}
                    {formatDt(h.prcsDt) || "-"} · {h.prcsMbrNm || "-"}
                    {h.sbmsnSeq !== null && ` · ${h.sbmsnSeq}회차`}
                  </div>
                  {/* 검토 의견은 응답자에게 전달되는 자유 입력이라 줄바꿈을 그대로 살린다 */}
                  {h.rvwOpnnCn && (
                    <div className="mt-[3px] text-[16px] leading-[1.7] whitespace-pre-wrap break-words lg:text-[15px]">
                      {h.rvwOpnnCn}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
