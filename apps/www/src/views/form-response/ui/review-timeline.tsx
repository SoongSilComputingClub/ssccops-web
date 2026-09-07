import type {
  FormResponseReviewHistory,
  ReviewProcessCode,
} from "@/entities/form";
import { formatDt } from "@/shared/lib/date";
import { Card } from "@/shared/ui";

/*
 * 검토 처리 타임라인 (서버 #141 · #177).
 *
 * **제출(SUBMIT)도 한 줄로 들어간다.** 그래야 "제출 → 수정요청 → 재제출 → 승인"으로 읽히고,
 * 각 줄의 회차가 어느 제출본에 대한 처리였는지를 말한다 — 제출 줄이 빠지면 사유가 어느 답을
 * 보고 쓴 것인지 알 수 없다.
 *
 * 서버가 처리 일시 오름차순으로 내려주므로 **다시 정렬하지 않는다.**
 *
 * 처리자_명이 제출자에게도 보인다(서버 `#177` 결정 1 — 동아리 내부 결재라 감출 값이 아니다).
 * 비어 있으면 그 자리를 그리지 않는다 — "-"로 메우면 서버가 준 값과 구별할 수 없다.
 */

const PROCESS_LABEL: Record<ReviewProcessCode, string> = {
  SUBMIT: "제출",
  REQUEST_CHANGES: "수정 요청",
  ACCEPT: "승인",
  REJECT: "반려",
};

/** 수정 요청만 색을 준다 — 이 화면에 온 까닭이고, 나머지는 지나온 자취다 */
const NEEDS_ATTENTION: ReviewProcessCode = "REQUEST_CHANGES";

export function ReviewTimeline({
  histories,
}: {
  histories: FormResponseReviewHistory[];
}) {
  if (histories.length === 0) return null;

  return (
    <Card className="flex flex-col gap-[10px]">
      <div className="text-[15px] font-semibold">처리 내역</div>

      <ol className="flex flex-col gap-[10px]">
        {histories.map((history) => {
          const attention = history.rvwPrcsSeCd === NEEDS_ATTENTION;

          return (
            <li
              key={history.formRspnsRvwHstryId}
              className="flex flex-col gap-[3px] border-l-2 pl-[10px]"
              style={{ borderColor: attention ? "#c2410c" : "#e5e8eb" }}
            >
              <div className="flex flex-wrap items-center gap-[6px] text-[13.5px]">
                <span className={attention ? "font-semibold text-amber-800" : "text-n300"}>
                  {PROCESS_LABEL[history.rvwPrcsSeCd]}
                </span>
                {history.sbmsnSeq !== null && history.sbmsnSeq > 1 && (
                  <span className="text-n500">{history.sbmsnSeq}회차</span>
                )}
                {history.prcsMbrNm && <span className="text-n500">{history.prcsMbrNm}</span>}
                {history.prcsDt && (
                  <span className="text-n500">{formatDt(history.prcsDt)}</span>
                )}
              </div>

              {history.rvwOpnnCn && (
                <p className="text-[13.5px] leading-[1.7] whitespace-pre-line text-n300">
                  {history.rvwOpnnCn}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
