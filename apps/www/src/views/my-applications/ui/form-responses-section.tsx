"use client";

import { useMemo, useState } from "react";
import type { MyFormResponseOverview } from "@/entities/form";
import { Chip, EmptyState } from "@/shared/ui";
import { FormResponseCard } from "./form-response-card";

/*
 * 폼 응답 구역 (ssccops#221).
 *
 * ── 왜 행사 신청과 구역을 나누는가 ────────────────────────────
 * 두 목록의 **상태 어휘가 다르다.** 행사 신청은 참가자 명단까지 합친 '신청 결과'
 * (`ApplicationStatus`)이고 폼 응답은 심사 상태(`ResponseStatus`)다 — 한 목록에 섞으면 같은
 * 자리에 놓인 배지가 서로 다른 축을 가리키고, 정렬도 무엇을 기준으로 한 것인지 말할 수 없다.
 * 응답자에게 "내가 낸 것"이 한 가지라 **화면은 하나**로 두되(ssccops#221 결정) 그 안에서 구역을
 * 나누는 것이 두 요구를 동시에 만족시키는 자리다.
 *
 * ── 왜 클라이언트인가 ────────────────────────────────────────
 * 이 앱은 전 화면이 서버 컴포넌트인데, 라벨 칩은 눌러서 거르는 조작이라 상태가 필요하다.
 * 데이터는 서버가 이미 받아 넘겨주므로 이 컴포넌트가 하는 일은 거르기 하나뿐이다 — 조회를
 * 클라이언트로 내리면 이 앱에 없던 데이터 페칭 상태 기계가 생긴다.
 *
 * ── 거르기는 화면에서 한다 ──────────────────────────────────
 * 목록이 페이징 없이 전량으로 오므로(서버 #270) 배열을 거르면 그만이다. 서버에 라벨 필터를
 * 여는 것은 "받아 둔 것 밖에도 답이 있을 때" 필요한 일이고 여기는 그렇지 않다.
 */

/** 조치가 필요한 상태 — 이 응답들이 목록 맨 위로 온다 */
const NEEDS_ACTION = "CHANGES_REQUESTED";

export function FormResponsesSection({
  responses,
  reviewOpinions,
}: Readonly<{
  responses: MyFormResponseOverview[];
  /** formRspnsId → 수정요청 사유. 조회하지 못한 건은 키가 없다 */
  reviewOpinions: Record<number, string>;
}>) {
  const [labelId, setLabelId] = useState<number | null>(null);

  /*
   * 라벨은 응답이 실제로 달고 있는 것만 칩으로 세운다 — 폼 라벨 전체를 불러 세우면 내가 낸 적
   * 없는 라벨이 칩으로 뜨고, 누르면 언제나 빈 목록이 된다.
   */
  const labels = useMemo(() => {
    const seen = new Map<number, string>();
    for (const response of responses) {
      for (const label of response.labels) {
        if (!seen.has(label.formLblId)) seen.set(label.formLblId, label.lblNm);
      }
    }
    return [...seen].map(([formLblId, lblNm]) => ({ formLblId, lblNm }));
  }, [responses]);

  /*
   * **조치가 필요한 건이 먼저 온다.** 이 화면에 오는 까닭이 그것이고, 서버 정렬(마지막으로
   * 움직인 순)만으로는 수정요청이 아래로 밀릴 수 있다 — 수정요청을 받은 뒤로 아무 일도
   * 일어나지 않은 응답일수록 오래된 것으로 취급되기 때문이다.
   */
  const visible = useMemo(() => {
    const filtered =
      labelId === null
        ? responses
        : responses.filter((response) =>
            response.labels.some((label) => label.formLblId === labelId),
          );

    return [...filtered].sort((a, b) => {
      const aFirst = a.rspnsSttsCd === NEEDS_ACTION ? 0 : 1;
      const bFirst = b.rspnsSttsCd === NEEDS_ACTION ? 0 : 1;
      return aFirst - bFirst;
    });
  }, [responses, labelId]);

  if (responses.length === 0) {
    return (
      <EmptyState
        title="아직 낸 응답이 없습니다"
        description="받은 폼 링크를 열면 이 화면에서 진행 상황을 확인할 수 있습니다"
      />
    );
  }

  return (
    <div className="flex flex-col gap-[12px]">
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-[6px]">
          <Chip active={labelId === null} onClick={() => setLabelId(null)}>
            전체
          </Chip>
          {labels.map((label) => (
            <Chip
              key={label.formLblId}
              active={labelId === label.formLblId}
              onClick={() => setLabelId(label.formLblId)}
            >
              {label.lblNm}
            </Chip>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState title="이 라벨에 해당하는 응답이 없습니다" />
      ) : (
        <div className="flex flex-col gap-[12px]">
          {visible.map((response) => (
            <FormResponseCard
              key={response.formRspnsId}
              response={response}
              reviewOpinion={reviewOpinions[response.formRspnsId] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
