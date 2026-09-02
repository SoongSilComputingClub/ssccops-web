import type { MyFormResponse } from "@/entities/response";

/*
 * 다음 제출이 어느 건으로 들어가는가 (서버 `findContinuableResponse`). 어드민
 * `features/form/model/proposal-continuation.ts`에서 옮겨 왔다.
 *
 * **제출 경로에는 응답 식별자가 없다.** `POST /v1/forms/{formId}/responses`는 폼만 지목하고
 * 어느 건을 이어 쓸지는 서버가 고른다. 기획안은 여러 건을 받는 폼(`mltplRspnsYn = true`)이라,
 * 수정요청을 받아 둔 채 새 기획안을 내려는 순간 두 뜻이 겹치는데 서버는 재제출을 우선한다 —
 * 그러지 않으면 수정요청받은 건을 지목할 방법이 없어 마무리할 수 없다.
 *
 * 이 함수는 무엇을 보낼지 정하지 않는다. 보내는 것은 언제나 같은 요청이고 고르는 것은
 * 서버다 — 여기서 하는 일은 **서버가 고를 건을 목록에서 짚어 주는 것**뿐이라, 어긋나도
 * 제출 결과가 달라지지 않는다(다음 조회에서 표시가 맞춰진다).
 */

/**
 * 다음 제출이 이어 쓸 응답. 없으면 다음 제출은 새 기획안이 된다.
 *
 * 고르는 순서가 규칙이다 — 작성 중(DRAFT)이 있으면 언제나 그 건(초안은 최대 1건), 없으면
 * 수정요청받은 건 중 마지막이다. **목록을 다시 정렬하지 않는다** — 서버가 응답 순번 오름차순
 * 으로 내려주므로 마지막 원소가 곧 순번이 가장 큰 건이다.
 */
export function continuableResponse(
  responses: MyFormResponse[],
): MyFormResponse | null {
  const draft = responses.find((r) => r.rspnsSttsCd === "DRAFT");
  if (draft) return draft;

  const changesRequested = responses.filter(
    (r) => r.rspnsSttsCd === "CHANGES_REQUESTED",
  );
  return changesRequested.length === 0
    ? null
    : (changesRequested[changesRequested.length - 1] ?? null);
}
