import type { MyFormResponseOverview } from "@/entities/form";

/*
 * 낸 폼 응답을 다루는 순수 규칙 — 서버 컴포넌트와 클라이언트 구역(`FormResponsesSection`)이
 * 함께 읽는다. 전송 계층을 모른다.
 */

/** 허브가 묶음마다 보여 주는 최근 건수 (#574) */
export const HUB_PREVIEW_COUNT = 3;

/** 조치가 필요한 상태 — 이 응답들이 목록 맨 위로 온다 */
const NEEDS_ACTION = "CHANGES_REQUESTED";

/**
 * **조치가 필요한 건이 먼저 온다.** 이 화면에 오는 까닭이 그것이고, 서버 정렬(마지막으로
 * 움직인 순)만으로는 수정요청이 아래로 밀릴 수 있다 — 수정요청을 받은 뒤로 아무 일도
 * 일어나지 않은 응답일수록 오래된 것으로 취급되기 때문이다. 나머지 순서는 서버 것 그대로다
 * (안정 정렬).
 */
export function needsActionFirst(responses: readonly MyFormResponseOverview[]) {
  return [...responses].sort((a, b) => {
    const aFirst = a.rspnsSttsCd === NEEDS_ACTION ? 0 : 1;
    const bFirst = b.rspnsSttsCd === NEEDS_ACTION ? 0 : 1;
    return aFirst - bFirst;
  });
}

/**
 * 기획안 응답과 나머지를 가른다 (#574 · ssccops#428).
 *
 * 목록 항목에는 시스템 폼 여부가 없어 기획안 폼의 `formId`(`GET /v1/forms/system/PROPOSAL`)와
 * 견준다 — 첫 판(#518)이 «기획안» 칩을 달던 판정과 같다. `proposalFormId`를 모르면(조회 실패)
 * 가를 수 없으므로 전부 «낸 폼»에 남긴다 — 칩이 빠지던 그때와 같은 모양이고, 기획안이 사라지는
 * 편보다 낫다.
 */
export function splitProposals(
  responses: readonly MyFormResponseOverview[],
  proposalFormId: number | null,
): { forms: MyFormResponseOverview[]; proposals: MyFormResponseOverview[] } {
  if (proposalFormId === null) return { forms: [...responses], proposals: [] };
  const forms: MyFormResponseOverview[] = [];
  const proposals: MyFormResponseOverview[] = [];
  for (const response of responses) {
    (response.formId === proposalFormId ? proposals : forms).push(response);
  }
  return { forms, proposals };
}

/**
 * 상태 필터 — 주소의 `?status=`가 아는 코드일 때만 거른다. 모르는 값은 «전체»로 본다 —
 * 오타 하나에 빈 목록을 보이느니 다 보이는 편이 낫고, 칩은 목록에 실제로 있는 상태만 세운다.
 */
export function filterByStatus<T>(
  items: readonly T[],
  status: string | null,
  statusOf: (item: T) => string,
  known: readonly string[],
): T[] {
  if (status === null || !known.includes(status)) return [...items];
  return items.filter((item) => statusOf(item) === status);
}

/** 목록에 실제로 있는 상태만, `order`의 순서로 — 없는 상태의 칩은 눌러도 빈 목록이라 세우지 않는다 */
export function presentStatuses<T>(
  items: readonly T[],
  statusOf: (item: T) => string,
  order: readonly string[],
): string[] {
  const present = new Set(items.map(statusOf));
  return order.filter((code) => present.has(code));
}
