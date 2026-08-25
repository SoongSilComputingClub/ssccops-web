"use client";

import type { QitemCpstCn } from "@ssccops/form-renderer";
import { PROPOSAL_REVIEW_READ_DENIED, useProposalReview } from "@/features/form";
import { ResponseReviewTimeline } from "@/features/response";
import { rspnsValueText } from "@/entities/response";
import { EmptyState } from "@/shared/ui";

/*
 * 기획안 한 건을 펼쳤을 때 보이는 것 (#163) — 내가 낸 내용과 처리 이력.
 *
 * ── 목록에는 이 값들이 없다 ───────────────────────────────────
 * `GET .../responses/mine`은 건수와 상태만 싣는다(서버가 응답 내용을 계약에서 뺐다). 답도
 * 처리자·시각·사유도 응답 단건 조회에만 있으므로, 그 요청은 **펼칠 때** 한 번 나간다 —
 * 목록과 함께 부르면 낸 건수만큼 요청이 나가는데 실제로 읽는 것은 그중 한둘이다.
 *
 * ── 문항 라벨은 폼에서 온다 ───────────────────────────────────
 * 응답은 `qitemId → 값`이라 그것만으로는 무엇에 대한 답인지 알 수 없다. 라벨을 화면에 적어 두면
 * 운영진이 문구를 고치는 순간 갈리므로 폼의 문항 구성을 그대로 따라 그린다 — **유형·활동명 같은
 * 개별 문항을 이름으로 지목하지 않는 것도 같은 이유다.** 코드가 `qitemId`를 박으면 #156이
 * 지운 역산이 되살아난다(계약 문항은 서버가 알려준다).
 *
 * 답이 없는 문항은 줄을 만들지 않는다 — 선택 문항을 비워 둔 것과 값이 있는 척하는 것은 다르다.
 */
export function ProposalSubmissionDetail({
  formId,
  formRspnsId,
  qitemCpstCn,
}: {
  formId: number;
  formRspnsId: number;
  /** 폼 상세를 아직 못 받았으면 null — 그때는 답 대신 처리 이력만 그린다 */
  qitemCpstCn: QitemCpstCn | null;
}) {
  const review = useProposalReview(formId, formRspnsId);

  if (review.status === "loading") {
    return <EmptyState padding="sm" message="검토 내용을 불러오는 중입니다…" />;
  }

  /* 권한 부족에는 다시 시도를 주지 않는다 — 몇 번을 눌러도 같다 */
  if (review.status === "denied") {
    return <EmptyState padding="sm" message={PROPOSAL_REVIEW_READ_DENIED} />;
  }

  if (review.status === "not-found") {
    return (
      <EmptyState
        padding="sm"
        message="이 기획안을 찾을 수 없습니다 — 목록을 다시 불러와주세요"
      />
    );
  }

  if (review.status === "error" || review.detail === null) {
    return (
      <EmptyState
        padding="sm"
        message={review.errorMessage}
        action={{ label: "다시 시도", onClick: review.reload }}
      />
    );
  }

  const detail = review.detail;
  const answered =
    qitemCpstCn === null
      ? []
      : qitemCpstCn.qitems
          .map((q) => ({
            qitemId: q.qitemId,
            label: q.qitemLblNm,
            value: rspnsValueText(detail.rspnsCn, q.qitemId),
          }))
          .filter((row) => row.value !== "");

  return (
    <div className="mt-3 flex flex-col gap-3">
      {answered.length > 0 && (
        <div className="rounded-[12px] bg-bg px-3 py-[10px]">
          <div className="text-[13px] tracking-[.3px] text-n400">낸 내용</div>
          <dl className="mt-2 flex flex-col gap-[10px]">
            {answered.map((row) => (
              <div key={row.qitemId}>
                <dt className="text-[13px] text-n500">{row.label}</dt>
                {/* 커리큘럼처럼 여러 줄로 적는 답이 있어 줄바꿈을 그대로 살린다 */}
                <dd className="mt-[2px] text-[15px] leading-[1.7] whitespace-pre-wrap break-words">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/*
        처리 이력 타임라인은 응답 심사 화면과 **같은 컴포넌트**다 (features/response · #141).
        제출자용으로 한 벌 더 만들면 회차 표기·빈 의견 처리 같은 규칙이 두 벌이 된다.
      */}
      <ResponseReviewTimeline histories={detail.reviewHistories} />
    </div>
  );
}
