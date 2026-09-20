import type { MyFormResponseOverview } from "@/entities/form";
import { fetchMyResponseDetail } from "@/entities/form/api/my-response-detail";

/*
 * 수정요청 사유 모으기 — 서버 컴포넌트 전용 (`fetchMyResponseDetail` → `next/headers`).
 *
 * **수정요청 사유는 응답 상세(서버 #177)에만 있다** — 목록은 "무엇을 어떤 상태로 냈는가"까지만
 * 답한다. 그래서 수정요청을 받은 건에 대해서만 상세를 한 번씩 더 부른다. 전부 부르지 않는 것은
 * 사유가 있는 상태가 그것 하나이기 때문이고, 그런 건은 대개 없거나 한둘이라 요청 수가 목록
 * 길이에 비례하지 않는다.
 *
 * 사유 조회가 실패해도 카드는 선다 — 사유를 못 읽는 것과 수정요청을 받았다는 사실을 모르는
 * 것은 다른 일이고, 후자만 막으면 이 화면은 제 몫을 한다. 실패한 건은 결과에 키가 없다.
 */
export async function loadReviewOpinions(
  responses: readonly MyFormResponseOverview[],
): Promise<Record<number, string>> {
  const changesRequested = responses.filter(
    (response) => response.rspnsSttsCd === "CHANGES_REQUESTED",
  );
  const details = await Promise.allSettled(
    changesRequested.map((response) =>
      fetchMyResponseDetail(response.formId, response.formRspnsId),
    ),
  );

  const reviewOpinions: Record<number, string> = {};
  for (const detail of details) {
    if (detail.status !== "fulfilled") continue;
    /*
     * 마지막 수정요청의 의견을 쓴다. 이력은 처리 일시 오름차순이라 뒤에서 찾으며, 승인·반려
     * 뒤에는 수정요청 상태로 돌아오지 않으므로 이 값이 곧 지금 고쳐야 할 이유다.
     */
    const opinion = [...detail.value.reviewHistories]
      .reverse()
      .find((history) => history.rvwPrcsSeCd === "REQUEST_CHANGES")?.rvwOpnnCn;
    if (opinion) reviewOpinions[detail.value.formRspnsId] = opinion;
  }
  return reviewOpinions;
}
