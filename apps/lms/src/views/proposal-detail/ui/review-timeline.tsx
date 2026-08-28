import {
  RSPNS_PRCS_SE_BADGE,
  type FormResponseReviewHistory,
} from "@/entities/response";
import { Badge, Card } from "@/shared/ui";
import { formatDt } from "@/shared/lib/date";

/*
 * 검토 이력 타임라인 (#171 · 서버 #141 · #177). 어드민 `features/response`의
 * `ResponseReviewTimeline`을 옮겨 왔다.
 *
 * ── 정렬도 합치기도 하지 않는다 ────────────────────────────────
 * 서버가 처리 일시 오름차순으로 내려준다. 화면이 다시 정렬하면 그 규칙이 두 벌이 되고, 같은
 * 시각의 두 줄이 화면마다 다른 차례로 보인다.
 *
 * ── 제출도 한 줄이다 ───────────────────────────────────────────
 * 검토만 쌓으면 "무엇에 대한 검토였는가"의 출발점이 사라진다. 재제출이 있으면 제출 줄이
 * 여러 번 나타나고 회차(`sbmsnSeq`)로 갈린다 — 타임라인이 "제출 → 수정요청 → 재제출 →
 * 승인"으로 읽힌다.
 *
 * ── 처리자 이름을 보여준다 ────────────────────────────────────
 * 서버가 제출자에게도 `prcsMbrNm`을 싣기로 했다(서버 #177 결정 1 — 동아리 내부 결재). 없는
 * 값은 메우지 않는다 — 검토 의견은 승인에서 선택이고 제출 줄에는 아예 없어, "(없음)"처럼
 * 값이 있는 척하지 않고 그 줄에서 의견 자리를 통째로 뺀다.
 *
 * 반려·수정요청 사유는 **서버가 준 문구를 그대로** 쓴다(#171 「지킬 것」).
 */
export function ReviewTimeline({
  histories,
}: {
  histories: FormResponseReviewHistory[];
}) {
  return (
    <Card>
      <div className="text-[13px] tracking-[.3px] text-n400">처리 이력</div>
      <p className="mt-[2px] text-[13px] leading-[1.7] text-n500">
        제출과 검토 처리가 시간순으로 쌓입니다.
      </p>

      {histories.length === 0 ? (
        <p className="mt-4 text-[13.5px] text-n500">
          아직 처리된 내역이 없습니다.
        </p>
      ) : (
        <ol className="mt-4 flex flex-col gap-4">
          {histories.map((h) => {
            const badge = RSPNS_PRCS_SE_BADGE[h.prcsSeCd];
            return (
              <li
                key={h.formRspnsRvwHstryId}
                /* 375px에서는 세로로 쌓이고 lg 이상에서 배지와 본문이 나란히 선다 */
                className="flex flex-col gap-[6px] border-l-2 border-line pl-[14px] lg:flex-row lg:gap-3 lg:border-l-0 lg:pl-0"
              >
                <div className="lg:w-[80px] lg:shrink-0">
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] text-n500">
                    {formatDt(h.prcsDt) || "-"} · {h.prcsMbrNm || "-"}
                    {h.sbmsnSeq !== null && ` · ${h.sbmsnSeq}회차`}
                  </div>
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
